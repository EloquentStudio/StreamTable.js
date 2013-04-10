var ft;
$(document).ready(function() {
  var data = Movies[1], html = $.trim($("#template").html()), template = Mustache.compile(html);
  var view = function(record, index){
    return template({record: record, index: index});
  };
  var $summery = $('#summery');
  var $found = $('#found');
  var $record_count = $('#record_count');

  $('#found').hide();

  var callbacks = {
    pagination: function(summery){
      if ($.trim($('#ftl_search').val()).length > 0){
        $found.text('Found : '+ summery.total).show();
      }else{
        $found.hide();
      }
      $summery.text( summery.from + ' to '+ summery.to +' of '+ summery.total +' entries');
    },
    after_add: function(){
      var percent = this.data.length*100/2000;
      $record_count.text(this.data.length + ' ('+ percent +'%)').attr('style', 'width:' + percent + '%');
    }
  }

  ft = FilterTable('#filter_table',
    { view: view, 
      per_page: 10, 
      data_url: 'data/movies.json',
      stream_after: 0.5,
      fetch_data_limit: 100,
      callbacks: callbacks,
      pagination: {span: 5, next_text: 'Next &rarr;', prev_text: '&larr; Previous'}
    }
  , data);

  //Only for example: Stop ajax streaming beacause from localfile data size never going to empty.
  var timer = setTimeout(function(){
    ft.clearTimer();
    $('.example .progress').removeClass('active');
    clearTimeout(timer);
   }, 10*1000);

});

