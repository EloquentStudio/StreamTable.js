var st; //For debuggin only
$(document).ready(function() {
  var data = Movies[1], html = $.trim($("#template").html()), template = Mustache.compile(html);
  var view = function(record, index){
    return template({record: record, index: index});
  };
  var $summary = $('#summary');
  var $found = $('#found');
  var $record_count = $('#record_count');

  $('#found').hide();

  var callbacks = {
    pagination: function(summary){
      if ($.trim($('#st_search').val()).length > 0){
        $found.text('Found : '+ summary.total).show();
      }else{
        $found.hide();
      }
      $summary.text( summary.from + ' to '+ summary.to +' of '+ summary.total +' entries');
    },
    after_add: function(){
      var percent = this.data.length*100/2000;
      $record_count.text(percent + '%').attr('style', 'width:' + percent + '%');

      //Only for example: Stop ajax streaming beacause from localfile data size never going to empty.
      if (this.data.length == 2000){
        this.stopStreaming();
        $('.example .progress').removeClass('active').hide();
      }

    }
  }

  st = StreamTable('#stream_table',
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
  /*
  var timer = setTimeout(function(){
    st.clearTimer();
    $('.example .progress').removeClass('active').hide();
   }, 10*1000);
  */ 

});

