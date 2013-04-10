var ft;
$(document).ready(function() {
  var data = randomMovies(), html = $.trim($("#template").html()), template = Mustache.compile(html);
  var view = function(record, index){
    return template({record: record, index: index});
  };
  var $summery = $('#summery');
  var $found = $('#found');

  $('#found').hide();

  var callbacks = {
    pagination: function(summery){
        if ($.trim($('#ftl_search').val()).length > 0){
          $found.text('Found : '+ summery.total).show();
        }else{
          $found.hide();
        }
       $summery.text( summery.from + ' to '+ summery.to +' of '+ summery.total +' entries');
    }
  }

  ft = FilterTable('#filter_table',
    { view: view, 
      per_page: 10, 
      callbacks: callbacks,
      pagination: {span: 5, next_text: 'Next &rarr;', prev_text: '&larr; Previous'}
    }
  , data);

  $('.record_count .badge').text(data.length);

  $('#add_more').on('click', function(){
    $('#spinner').show();
    addMovies(5);
    return false;
  });


  //Simulate ajax json


  $.getJSON('data/movies.data').done(function(data){
  }).fail(function(e){ console.log(e)});

});

function randomMovies(){
  var i = Math.floor(parseInt(Math.random()*100)) % Movies.length;
  return Movies[i];
}

function addMovies(count){
  if (count){
    for(var i = 0; i < count; i++)
      ft.addData(randomMovies());
  }else{
    ft.addData(randomMovies());
  }

  $('.record_count .badge').text(ft.data.length);
  $('#spinner').hide();
}
