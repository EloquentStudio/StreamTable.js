StreamTable.js
==============

StreamTable.js streams data for tables in the background, updates and renders them using templating frameworks like Mustache.js, HandleBars.js 

Why StreamTable.js?
-------------------

Sometimes we want to show thousands of records in a table. This can take too long for the page to render and make the page unusable till the entire table is populated. To counter this we could populate the table using an Ajax call. In both cases, the users have to wait until all the table rows are populated. Additionally, user cannot do any operations on the table like search, pagination etc.

The idea behind StreamTable.js is to initially populate minimum rows (maybe 10 or 20) and after that in stream data silently in the background and update the table. This ensures that the page loads immediately and is also usable immediately for all operations. It maybe safe to assume that if the user remains on the same page for a little while longer, then the user is most probably going to perform some operation on table like search, page navigation, etc. So we can delay the process of streaming data to say 2 seconds after the page has loaded. Its also important to ensure that all the data streamed must be usable immediately. For example, after 2 seconds, if we have streamed 1000 rows, they should all be searchable and paginated.

Usage
-----

StreamTable has 3 arguments: the container (table) css selector, options and JSON data. This will render the table, set the pagination, search box and per page selection. The view function is mandatory in the options. 

```javascript
var options = {
  view: view,                  //View function to render table rows.
  data_url: 'data/data.json',  //Data fetching url
  stream_after: 2,             //Start streaming after 2 secs
  fetch_data_limit: 500,       //Streaming data in batch of 500 
} 

var st = StreamTable('#stream_table', options, data);
	
OR
    
$('#stream_table').stream_table(options, data); //Use as a jQuery plugin.
```
	
"#stream_table" is the table selector which has initial structure with 'thead' and 'tbody'.

Here is a view function that has two arguments: JSON 'record' and the index. I have used Mustache.js as the html templating framework but you are free to choose your rendering mechanism.
 

```javascript
var template = Mustache.compile($.trim($("#template").html()));

var view = function(record, index){
  return template({record: record, index: index});
};
```
	
 
Template Html:

```html
<script id="template" type="text/html">
  <tr>
    <td>{{index}}</td>
    <td>{{record.name}}</td>
    <td>{{record.director}}</td>
    <td>{{record.actor}}</td>
    <td>{{record.rating}}</td>
    <td>{{record.year}}</td>
  </tr>
</script>
```
 	
The initial display is also JSON data. The data format must be an array of arrays or an array of objects. If the JSON data is not in these formats, you can change the data format to allowed formats using the 'before_add' callback.
    
```javascript
var data = [
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
		...
		...
		...
];
```

 
Options
=======

- view function
- stream
- callbacks
- pagination options, per page selection options.
- search box 
 
**Note:** Only view function is mandatory.	

Stream:
-------
	
```javascript
data_url: 'data/data.json',  //Data fetching url
stream_after: 1,             //Start streaming after 1 sec
fetch_data_limit: 500,       //Streaming data in batch of 500.
```
	
When you stream data in batches it will send ajax requests in following format. The offset will increase after each request by fetch_data_limit.

     data/data.json?q="search text"&limit=500&offset=1000
	
if 'fetch_data_limit' option is not define then stream table will send only one ajax request to fetch all remaining data.	

**Note:** Since the first page is being loaded with initial data, remember that the stream data request should send the **remaining** data and not all the data. Otherwise, you would have duplidate data that was loaded initially.

Searchbox: 
---------
If searchbox option is not defined, then by default search box going to be added at the top of the table with class '.st_search' and id '#st_search'.
If you have already searcbox then you can set the selector.

    search_box: '#my-searchb0x'
	
You can enable search on specific fields

    fields: ['id', 'name']  //if each record is an object, then mention the field names. i.e {user: {id: 1, name: 'user', amount: 2}}
    fields: [0, 2]          //if each record is an array, then mention the index of fields. i.e [1, 'User', '2']
    
Pagination Options:
-------------------

```javascript
pagination: {
  span: 5,                               //Max Pagination span window.
	next_text: 'Next &rarr;',              
	prev_text: '&larr; Previous',
	container_class: '.users-pagination',  //Add pagination div class. Default  is .st_pagination.
	ul_class: '.larger-pagination',        //Add pagination ul class. Default is  .pagination.
	per_page_select: true,                 //Show per page select box. Default us true.
	per_page_opts: [10, 25, 50],           //Per Page select box options. Default is [10, 25, 50].
	per_page_class: '.select-box'          //Per page select box class. Default is .st_per_page.
	per_page: 20                           //Show number of record per page. Defalut 10.
}
```  

If per_page_select is set to false, it will not show per page select box. If you have already select box for this then you can set selector of it i.e per_page_select: '#my-per-page'. If you are not using per page select box then you can set number of records you want to show on a page using 'per_page'.

Callbacks: 
----------

stream table has pagination, before_add and after_add data callbacks.

```javascript
var callbacks = {
  pagination: function(summary){
    $('#summary').text( summary.from + ' to '+ summary.to +' of '+ summary.total +' entries');
  },
  after_add: function(){
    $('#records_count').text(this.data.length);
  },
  before_add: function(data){
    var new_data = [], d;

    for(id in data){
      d = data[id].push(id);
      new_data.push(d);
    }
    return new_data;
  }	
}
```  


1. pagination: This callback executes after search, on page navigation, after data is added and when the per_page select box is changed. Using this callback user can update the summary of how many rows were found in search and also show current offset eg. '1 to 10 of 2000 entries'. It has one argument 'summary' that has 3 values: 'from' record, 'to' record and 'total' entries. 

2. after_add: This callbacks execute after data is added. This is used when you stream data in batches and want to show the udpated records count.

3. before_add: This will execute before adding data. One use is to change data format to one that is compatible with streamTable. Remember to return the changed data. i.e if the data format is like {1: ['user-1', 10], 2: ['user-2', 100]}, we can convert it to an array of objects or an array of arrays, according to your view template.

After the conversion, the data MUST look like this:

	[[1,'user-1', 10], [2,'user-2', 100]] 

	OR 

	[{user: {id: 1, name: 'user-1', amount: 10}}, {user: {id: 2, name: 'user-2', amount: 100}}]


Complete Options for reference:
-------------------------------

```javascript
var options = {
	view: view,                  
	data_url: 'data/data.json',
	stream_after: 1,   
	fetch_data_limit: 500, 
	pagination:{
		span: 5,                              
		next_text: 'Next &rarr;',              
		prev_text: '&larr; Previous',
		container_class: '.users-pagination', 
		ul_class: '.larger-pagination',       
		per_page_select: true,                 
		per_page_opts: [10,25,50],            
		per_page_class: '.select-box',       
		per_page: 20      
	},
	search_box: '#my-searchbox',
	fields: ['id', 'name']    //Or [1,2] index of array.
} 
```  
	
	
Extra
-----

If you are using StreamTable as a jQuery plugin and you want the stream table object, you can do this

    var st = $('#stream_table').data('st')

Now, you can add more data manually.

    st.addData(data);

Demo
----

[Basic Table](http://jiren.github.io/StreamTable.js/index.html)

[Streaming Table](http://jiren.github.io/StreamTable.js/stream.html)


Contributing
------------
Please send me a pull request so that this can be improved.

License
-------
This is released under the MIT license.
