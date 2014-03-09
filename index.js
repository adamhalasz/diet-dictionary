// ======= Dictionary =======
// CONSTRUCT dictionary from a myslq database

// Require Template Engine
var template = require('./library/template');

exports.setup = function(app, callback){
	
	// Dictionary Skeleton
	var dict 		= this;
	dict.languages 	= []; 
	dict.dictionary = {};
	dict.echo 		= function(string){ return string; }	
	
	if(app.mysql && app.mysql.database){
			
		// ======= The Dictionary Module =======
		dict.echo = function(main_language){
			return function(string, data){
				var language 		= main_language || 'english';
				var clean_string 	= dict.clean_words(string);
				var clean_language 	= dict.clean_words(language);
				
				if( isset(dict.dictionary[clean_string]) && // If String is translated
					isset(language) 		  && 			// If language is required
					clean_language != 'english' 	  && 	// If language is not english
					inArray(clean_language, dict.languages) // If language is supported
				){
					return (!isset(data)) 
							? dict.dictionary[clean_string][clean_language]
							: template(dict.dictionary[clean_string][clean_language], data);
				} else {
					return (!isset(data)) ? string : template(string, data);
				}
			}
		}
		var MySQL = new MySQLClient(app.mysql);
		MySQL.connect(function(mysqlObject, error){
			
			// Append MySQL Error to MySQL Object
			mysqlObject.error = error;
			
			// MySQL Query Wrapper
			var sql = mysql_wrapper({}, {}, mysqlObject, {});
			
			// SELECT dictionary from the database
			// then turn in into a JSON object that
			// the Echo function can use 
			sql.query('SELECT * FROM dictionary', function(errors, rows){
				if(rows && rows.length){
					rows.forEach(function(row){
						var index = {};
						for(key in row){
							if(row.hasOwnProperty(key) && key != 'page') {
								dict.addSupportedLanguage(key);
								index[dict.clean_words(key)] = row[key];
							}
						}
						
						dict.dictionary[dict.clean_words(row.english)] = index;
					});
					create_dictionary_root(dict.dictionary);
					sql.end();
					if(isset(callback)) callback(dict);
				} else {
					if(isset(callback)) callback(dict);
				}
			});
			
		}, app.mysql.database);
		
		// ======= Support functions =======
		function create_dictionary_root(dictionary){
			// CREATE echo function
			function echo(string, data){	
				var selected_language 	= window.language || 'english';
				var clean_string 		= clean_words(string);
				var clean_language 		= clean_words(language);
				
				if( isset(dictionary[clean_string]) && 			 // If String is translated
					isset(selected_language) 		  && 		 // If language is required
					clean_language != 'english' 	  && 		 // If language is not english
					inArray(clean_language, languages) 			 // If language is supported
				){
					return (!isset(data)) 
							? dictionary[clean_string][clean_language]
							: template(dictionary[clean_string][clean_language], data);
				} else {
					return (!isset(data)) ? string : template(string, data);
				}
			}
			
			// DEFINE dictionary.js path
			var scripts_root 	= app.dictionary_root || '/scripts'
			var path 			= app.public+scripts_root+'/dictionary.client';
			
			// ADD default language as `english`
			output = 'window.language = window.language || "english"; ';
			
			// ADD clean words function
			output += dict.clean_words.toString() + '; ';
			
			// ADD echo function
			output += echo.toString() + '; ';
			
			// ADD dict.languages
			output += 'window.languages = ' + JSON.stringify(dict.languages) + '; ';
			
			// ADD dictionary
			output += 'window.dictionary = ' + JSON.stringify(dictionary) + '; ';
			
			// CREATE dictionary.js into `path`
			fs.writeFileSync(path, output, 'utf8');
		}
		
		dict.addSupportedLanguage = function addSupportedLanguage(language){
			var lang = dict.clean_words(language);
			
			if(!inArray(lang, dict.languages)){ 
				dict.languages.push(lang); 
			}
			
		}
		
		dict.clean_words = function clean_words(string){
			return string.replace(/\n|\r/g, '').toLowerCase();
		}
	}
	return dict;
}

