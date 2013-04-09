(function(window, $) {

  'use strict';

  var FilterTable = function(container, opts, data) {
    return new _FilterTable(container, opts, data);
  };

  $.fn.filterTable = function (opts, data) {
    var $this = $(this), flt; 

    $this.data('flt', (flt = new _FilterTable($this, opts, data)));
    return flt;
  };

  window.FilterTable = FilterTable;

  var _FilterTable = function(container, opts, data) {
    this.data = [];
    this.table = container;
    this.$container = $(container).find('tbody');
    this.opts = opts;
    this.view = this.opts.view;
    this.text_index = [];
    this.last_search_result = [];
    this.last_search_text = '';
    this.current_page = 0;
    this.textFunc = null;
    this.stream_after = (this.opts.stream_after || 2)*1000;
    this.timer = null;
    this.opts.callbacks = this.opts.callbacks || {};

    if (!this.view) $.error('Add view function in options.');
    
    this.initPagination(this.opts.pagination || {});

    if (!this.opts.search_input) this.opts.search_input = this._addSearchBox();
    if (this.paging_opts.per_page_select) this._addPerPage();

    if (data) {
      this.addData(data);
      this.render(this.data, 0);
    }

    this.bindEvents();
    this.streamData(this.stream_after);
  }

  var _F = _FilterTable.prototype;

  _F.initPagination = function(opts){
    this.paging_opts = $.extend({
      span: 5,
      prev_text: '&laquo;',
      next_text: '&laquo;',
      per_page_select: '.ftl_per_page',
      per_page: 10,
      per_page_opts: [10,25,50],
    }, opts);

    this.paging_opts.container_class = ['flt_pagination', opts.container_class].join(' ');
    this.paging_opts.ul_class = ['pagination', opts.ul_class].join(' ');
    this.paging_opts.per_page_class = ['ftl_per_page', opts.per_page_class].join(' ');
    this.opts.pagination = this.paging_opts;

    $(this.table).after('<div class="'+ this.paging_opts.container_class  +'"></div>');
    this.$pagination = $('.flt_pagination'); 
  };

  _F.bindEvents = function(){
    var _self = this, 
        search_input = this.opts.search_input;

    $(search_input).on('keyup', function(e){
      _self.search($(this).val());
    });

    $(search_input).on('keypress', function(e){
      if ( e.keyCode == 13 ) return false;
    });

    if (_self.paging_opts.per_page_select){
      $(_self.paging_opts.per_page_select).on('change', function(){
        _self.renderByPerPage($(this).val());
      });
    }

    _self.$pagination.on('click', 'a', function(e){
      var $this = $(this), page = parseInt($this.text()), current_page;

      if (page.toString() == 'NaN'){
        if ($this.hasClass('prev')) page = 'prev';
        else if ($this.hasClass('next')) page = 'next';
        else if ($this.hasClass('first')) page = 1;
        else if ($this.hasClass('last')) page = _self.pageCount();
      }

      current_page = _self.paginate(page);
      if (current_page >= 0) {
        $('.flt_pagination .active').removeClass('active');
        $('.flt_pagination li[data-page='+ current_page +']').addClass('active');
      }

      return false;
    });

  };

  _F._addSearchBox = function(){
    $(this.table).before('<input name="search" type="text" id="ftl_search" class="ftl_search" placeholder="Type here...">');
    return '#ftl_search';
  };

  _F._makeTextFunc = function(record){
    var fields = this.opts.fields, cond_str = [], textFunc, is_array = false;

    if (record.toString() == '[object Object]'){
      fields = fields || Object.keys(record)

      for (var i = 0, l = fields.length; i < l; i++){
        cond_str.push("d."+ fields[i]);
      }
      eval("textFunc = function(d) { return (" + cond_str.join(" + ' ' + ") + ").toUpperCase(); }");
    }else{
      if (fields){
        for(var i = 0, l = fields.length; i < l ; i++){
          cond_str.push("d["+ fields[i] + "]");
        }
        eval("textFunc = function(d) { return (" + cond_str.join(" + ' ' + ") + ").toUpperCase(); }");
      }else{
        textFunc = function(d) {
          return d.join(' ').toUpperCase(); 
        } 
      }
    }

    return textFunc;
  };

  _F.buildTextIndex = function(data){
    var i = 0, l = data.length; 

    if (!this.textFunc) this.textFunc = this._makeTextFunc(data[0]);

    for(i; i < l; i++)
      this.text_index.push(this.textFunc(data[i]));
  }

  _F.render = function(data, page){
    var i = (page * this.paging_opts.per_page), 
        l = (i + this.paging_opts.per_page), 
        eles = [];

    if (data.length < l) l = data.length;

    for (i; i < l; i++)
      eles.push(this.view(data[i], (i+1)));
    
    this.$container.html(eles);
  };

  _F.search = function(text){
    var q = $.trim(text), count = 0;

    if (q == this.last_search_text) return;

    this.last_search_text = q;

    if(q.length == 0 ){
      this.render(this.data, 0);
      count = this.data.length
    }else{
      this.last_search_result = this.searchInData(q);
      this.render(this.last_search_result, 0);
      count = this.last_search_result.length
    } 

    this.current_page = 0;
    this.renderPagination(this.pageCount(), this.current_page);
    this.execCallbacks('pagination');
  };

  _F.searchInData = function(text){
    var result = [], i = 0, l = this.text_index.length, t = text.toUpperCase();

    for (i; i < l; i++){
      if (this.text_index[i].indexOf(t) != -1) result.push(this.data[i]);
    }

    return result;
  };

  _F.addData = function(data){
    data = this.execCallbacks('before_add', data) || data;

    var i = 0, l = data.length, t;

    if (data.length){
      this.buildTextIndex(data);
      this.data = this.data.concat(data);

      if (this.last_search_text.length > 0){
        this.last_search_result = this.searchInData(this.last_search_text);
        //TODO: Process search or sorting
        this.render(this.last_search_result, this.current_page);
      }

      this.renderPagination(this.pageCount(), this.current_page);
    }

    this.execCallbacks('pagination');
  };

  _F.fetchData = function(){
    var _self = this, params = {q: $(this.opts.search_input).val()}

    if (this.opts.fetch_data_limit) {
      params['limit'] = this.opts.fetch_data_limit;
      params['offset'] = this.data.length;
    }

    $.getJSON(this.opts.data_url, params).done(function(data){
      _self.addData(data);

      if (params.limit != null && data.length > 0) clearTimeout(_self.timer);
    });
  };

  _F.clearTimer = function(){
    if (_self.timer) clearTimeout(this.timer);
  };

  _F.streamData = function(time){
    if (!this.opts.data_url) return;
    var _self = this, timer;

    _self.timer = setTimeout(function(){
      _self.fetchData();
    }, time);
  };

  _F.pageCount = function(){
    if (this.last_search_text.length > 0){
      return Math.ceil(this.last_search_result.length/this.paging_opts.per_page);
    }else{
      return Math.ceil(this.data.length/this.paging_opts.per_page);
    }
  };

  //Render table rows for given page;
  _F.paginate = function(page){
    var page_count = this.pageCount();

    if(page == 'prev'){ 
      page = this.current_page - 1;
    }else if (page == 'next'){
      page = this.current_page + 1;
    }else {
      page = page - 1;
    }

    if (page == this.current_page || page < 0 || page >= page_count) return;

    if (this.last_search_text.length > 0){
      this.render(this.last_search_result, page)
    }else{
      this.render(this.data, page)
    }

    this.current_page = page;

    if (this.paging_opts.span <= page_count) this.renderPagination(page_count, this.current_page);

    this.execCallbacks('pagination');

    return this.current_page;
  };

  // Render Pagination call after new data added or search 
  _F.renderPagination = function(page_count, current_page){
    var i = 0, 
        l = page_count, 
        links = [ '<ul class="'+ this.paging_opts.ul_class +'">'],
        span = this.paging_opts.span,
        center = Math.ceil(span/2);

    if (page_count > span){
      links.push('<li><a href="#" class="first">First</a></li>');
      if (current_page > (center - 1) ) i = current_page - center;
      if (current_page < (page_count - center - 1) ) l = i + span;
    }

    links.push('<li><a href="#" class="prev">'+ this.paging_opts.prev_text +'</a></li>');

    for(i; i < l; i++){
      if(current_page == i){
        links.push('<li class="active" data-page="'+ i +'"><a href="#" class="active" >'+ (i + 1) +'</a></li>');
      }else{
        links.push('<li  data-page="'+ i +'"><a href="#">'+ (i + 1) +'</a></li>');
      }
    }

    links.push('<li><a href="#" class="next">'+ this.paging_opts.next_text + '</a></li>');

    if (page_count > this.paging_opts.span) links.push('<li><a href="#" class="last">Last</a></li>');

    links.push('</ul>');
    this.$pagination.html(links.join(''));
  };

  _F._addPerPage = function(){
    var html = ['<select size="1" name="per_page" class="'+ this.paging_opts.per_page_class +'">'];
    var arr = this.paging_opts.per_page_opts;

    for(var i = 0, l = arr.length; i < l; i ++)
        html.push('<option value="'+ arr[i] + '">'+ arr[i] +'</option>');

    html.push('</select>');

    $(this.table).before(html.join(' '));
  };

  _F.renderByPerPage = function(per_page){
    if (this.paging_opts.per_page == per_page) return;

    this.paging_opts.per_page = parseInt(per_page);
    this.current_page = 0;

    if(this.last_search_text.length == 0 ){
      this.render(this.data, 0);
    }else{
      this.render(this.last_search_result, 0);
    }
    this.renderPagination(this.pageCount(), 0);
    this.execCallbacks('pagination');
  };

  _F.execCallbacks = function(type, args){
    var callback = this.opts.callbacks[type];

    if (!callback) return;

    if (type == 'pagination'){
      var f = this.paging_opts.per_page * this.current_page;
      args = {
        from:  (f + 1), 
        to:    (this.paging_opts.per_page + f),
        total: (this.last_search_text.length > 0 ? this.last_search_result.length : this.data.length),
        page:  this.current_page 
      }

      if (args['total'] == 0) args['from'] = 0;
      if (args['to'] > args['total']) args['to'] = args['total'];
    }

    return callback.call(this, args);
  };

  FilterTable.extend = function (name, f ) {
    _FilterTable.prototype[name] = function () {
      return f.apply( this, arguments );
    };
  };

})(this, window.jQuery)

//In IE indexOf method not define.
if (!Array.prototype.indexOf) {
  Array.prototype.indexOf = function(obj, start) {
    for (var i = (start || 0), j = this.length; i < j; i++) {
      if (this[i] === obj) { return i; }
    }
    return -1;
  }
}
