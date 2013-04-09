FilterTable.js
=============

FilterTable.js 

Usage
-----
    
Json data
    
   var movies = [
      { name: 'Once Upon a Time in the West',
        rating: '8.7',
        director: 'Sergio Leone',
        year: '1968',
        actor: 'Henry Fonda' },
      { name: 'Terminator 2: Judgment Day',
        rating: '8.6',
        director: 'James Cameron',
        year: '1991',
        actor: 'Arnold Schwarzenegger' },
      { name: 'Braveheart',
        rating: '8.4',
        director: 'Mel Gibson',
        year: '1995',
        actor: 'Mel Gibson' }
    ];

    var template = Mustache.compile($.trim($("#template").html()));

    var view = function(record){
      return template(record);
    };

    var filter_table = FilterTable('#filter_table', {view: view, per_page: 10}, movies);

Add More Data
-------------

    filter_table.addData(data);

Contributing
------------
Please send me a pull request so that this can be improved.

License
-------
This is released under the MIT license.
