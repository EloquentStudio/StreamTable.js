/*
 * StreamTable.js
 * version: 1.1.1 (17/12/2013)
 *
 * Licensed under the MIT:
 *   http://www.opensource.org/licenses/mit-license.php
 *
 * Copyright 2013 Jiren Patel[ jiren@joshsoftware.com ]
 *
 * Dependency:
 *  jQuery(v1.8 >=)
 */

(function(window, $) {

  'use strict';

  var StreamTable = function(container, opts, data) {
    return new _StreamTable(container, opts, data);
  };

  StreamTable.VERSION = '1.1.0';

  $.fn.stream_table = function (opts, data) {
    var $this = $(this);
    if ($this.data('st')) return;
    $this.data('st', new _StreamTable($this.selector, opts, data));
  };

  window.StreamTable = StreamTable;

  var _StreamTable = function(container, opts, data) {
    this.data = [];
    this.main_container = container;
    this.$container = $(container);
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

    if (this.$container.get(0).tagName == 'TABLE') this.$container = this.$container.find('tbody');

    this.initPagination(this.opts.pagination || {});
    this.addSearchBox();
    this.addPerPage();
    this.has_sorting =  $(this.main_container + ' [data-sort]').length > 0 ? true : false;

    if (this.has_sorting) {
      this.sorting_opts = {};
      this.records_index = [];
      this.last_search_record_index = [];
    }

    if (data) {
      data = this.addData(data);
      this.render(0);
    }

    this.bindEvents();
    this.bindSortingEvents();
    this.streamData(this.stream_after);
  }

  var _F = _StreamTable.prototype;

  _F.getIndex = function(){
    return this.last_search_text.length > 0 ? this.last_search_record_index : this.records_index
  };

  _F.getData = function(){
    return this.last_search_text.length > 0 ? this.last_search_result : this.data;
  };

  _F.dataLength = function(){
    return this.has_sorting ? this.getIndex().length : this.getData().length;
  }

  _F.initPagination = function(opts){
    this.paging_opts = $.extend({
      span: 5,
      prev_text: '&laquo;',
      next_text: '&laquo;',
      per_page_select: true,
      per_page_opts: [10,25,50]
    }, opts);

    var p_classes = ['st_pagination'];

    if (opts.container_class){
      p_classes = [].concat.apply(p_classes, [opts.container_class])
    }

    this.paging_opts.per_page = this.paging_opts.per_page_opts[0] || 10;
    this.paging_opts.container_class = p_classes.join(' ');
    this.paging_opts.ul_class = ['pagination', opts.ul_class].join(' ');
    this.paging_opts.per_page_class = ['st_per_page', opts.per_page_class].join(' ');
    this.opts.pagination = this.paging_opts;

    var html = '<div class="'+ this.paging_opts.container_class  +'"></div>';

    if(this.paging_opts.container){
      $(this.paging_opts.container).html(html);
    }else{
      $(this.main_container).after(html);
    }

    this.$pagination = $('.' + p_classes.join('.'));
  };

  _F.bindEvents = function(){
    var _self = this,
        search_box = this.opts.search_box;

    $(search_box).on('keyup', function(e){
      _self.search($(this).val());
    });

    $(search_box).on('keypress', function(e){
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
        $('.st_pagination .active').removeClass('active');
        $('.st_pagination li[data-page='+ current_page +']').addClass('active');
      }

      return false;
    });

  };

  _F.addSearchBox = function(){
    if (this.opts.search_box) return;
    $(this.main_container).before('<input name="search" type="text" id="st_search" class="st_search" placeholder="Search here...">');
    this.opts.search_box = '#st_search';
  };

  _F._makeTextFunc = function(record){
    var fields = this.opts.fields, cond_str = [], textFunc, is_array = false;

    if(typeof fields == 'function'){
       textFunc = fields;
    } else if (record.constructor == Object){
      fields = fields || Object.keys(record)

      for (var i = 0, l = fields.length; i < l; i++){
        cond_str.push("d."+ fields[i]);
      }
      eval("textFunc = function(d) { return (" + cond_str.join(" + ' ' + ") + "); }");
    }else{
      if (fields){
        for(var i = 0, l = fields.length; i < l ; i++){
          cond_str.push("d["+ fields[i] + "]");
        }
        eval("textFunc = function(d) { return (" + cond_str.join(" + ' ' + ") + "); }");
      }else{
        textFunc = function(d) {
          return d.join(' ');
        }
      }
    }

    return textFunc;
  };

  _F.buildTextIndex = function(data){
    var i = 0, l = data.length;

    if (!this.textFunc) {
      this.textFunc = this._makeTextFunc(data[0]);
    }

    for(i; i < l; i++){
      this.text_index.push(this.textFunc(data[i]).toUpperCase());
    }
  };

  _F.render = function(page){
    var i = (page * this.paging_opts.per_page),
        l = (i + this.paging_opts.per_page),
        eles = [],
        index,
        d = this.has_sorting ? this.getIndex() : this.getData();

    if (d.length < l) l = d.length;

    if (this.has_sorting){
      for (i; i < l; i++){
        eles.push(this.view(this.data[d[i]], (i+1)));
      }
    }else{
      for (i; i < l; i++){
        eles.push(this.view(d[i], (i+1)));
      }
    }

    this.$container.html(eles);
  };

  _F.clearAndBuildTextIndex = function(data){
    this.text_index = []
    this.buildTextIndex(data)
  };

  _F.search = function(text){
    var q = $.trim(text), count = 0;

    if (q == this.last_search_text) return;

    this.last_search_text = q;

    if(q.length == 0 ){
      this.render(0);
    }else{
      this.searchInData(q);
      this.render(0);
    }

    this.current_page = 0;
    this.renderPagination(this.pageCount(), this.current_page);
    this.execCallbacks('pagination');
  };

  _F.searchInData = function(text){
    var result = [],
        i = 0,
        l = this.text_index.length,
        t = text.toUpperCase(),
        d = this.has_sorting ? this.records_index : this.data;

    if(this.has_sorting){
      for (i; i < l; i++){
        if (this.text_index[i].indexOf(t) != -1) result.push(i);
      }
      this.last_search_record_index = result
    }else{
      for (i; i < l; i++){
        if (this.text_index[i].indexOf(t) != -1) result.push(this.data[i]);
      }
      this.last_search_result = result
    }

  };

  _F.addData = function(data){
    data = this.execCallbacks('before_add', data) || data;

    if (data.length){
      var i = this.data.length, l = data.length + i;

      this.buildTextIndex(data);
      this.data = this.data.concat(data);

      if(this.has_sorting){
        for(i; i < l; i++){
          this.records_index.push(i);
        }
      }

      if (this.last_search_text.length > 0){
        this.searchInData(this.last_search_text);
      }

      if (this.opts.auto_sorting && this.current_sorting){
        this.sort(this.current_sorting);
      }

      this.render(this.current_page);
      this.renderPagination(this.pageCount(), this.current_page);
      this.execCallbacks('after_add', data);
      this.execCallbacks('pagination');
    }

    return data;
  };

  _F.fetchData = function(){
    var _self = this, params = {q: this.last_search_text}

    if (this.opts.fetch_data_limit) {
      params['limit'] = this.opts.fetch_data_limit;
      params['offset'] = this.data.length;
    }

    $.getJSON(this.opts.data_url, params).done(function(data){
      data = _self.addData(data);

      if (params.limit != null && (!data || !data.length ) ) {
        _self.stopStreaming();
      }else{
        _self.setStreamInterval();
      }

    }).fail(function(e){
      _self.stopStreaming();
    });
  };

  _F.setStreamInterval = function(){
    var _self = this;
    if(_self.opts.stop_streaming == true) return;

    _self.timer = setTimeout(function(){
      _self.fetchData();
    }, _self.stream_after);
  };

  _F.stopStreaming = function(){
    this.opts.stop_streaming = true;
    if (this.timer) clearTimeout(this.timer);
  };

  _F.streamData = function(time){
    if (!this.opts.data_url) return;
    var _self = this, timer;

    _self.setStreamInterval();

    if(!_self.opts.fetch_data_limit) _self.stopStreaming();
  };

  _F.pageCount = function(){
    return Math.ceil(this.dataLength()/this.paging_opts.per_page);
  };

  //Render table rows for given page
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

    this.render(page);
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

  _F.addPerPage = function(){
    var per_page_select = this.paging_opts.per_page_select, html, arr;

    if (per_page_select === false || typeof per_page_select == 'string') return;
    this.paging_opts.per_page_select = '.st_per_page';

    html = ['<select size="1" name="per_page" class="'+ this.paging_opts.per_page_class +'">'];
    arr = this.paging_opts.per_page_opts;

    for(var i = 0, l = arr.length; i < l; i ++)
        html.push('<option value="'+ arr[i] + '">'+ arr[i] +'</option>');

    html.push('</select>');
    $(this.main_container).before(html.join(''));
  };

  _F.renderByPerPage = function(per_page){
    if (this.paging_opts.per_page == per_page) return;

    this.paging_opts.per_page = parseInt(per_page);
    this.current_page = 0;
    this.render(0)
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
        total: this.dataLength(),
        page:  this.current_page
      }

      if (args['total'] == 0) args['from'] = 0;
      if (args['to'] > args['total']) args['to'] = args['total'];
    }

    return callback.call(this, args);
  };

  _F.bindSortingEvents = function(){
    var _self = this;

    $(this.main_container + ' [data-sort]').each(function(i){
      var $el = $(this)
          ,arr = $el.data('sort').split(':')
          ,data = { dir: arr[1] || 'asc',
                    type: arr[2] || 'string',
                    field: arr[0] };

      _self.sorting_opts[data.field] = {dir: data.dir, type: data.type, field: data.field }

      $el.on('click', data, function(e){
        var $this = $(this);

        $this.addClass(e.data.dir);
        _self.current_sorting = {dir: e.data.dir, type: e.data.type, field: e.data.field};
        _self.sort(e.data);
        _self.render(_self.current_page);

        e.data.dir = e.data.dir == 'asc' ? 'desc' : 'asc';
        $(this).removeClass(e.data.dir);

        if(_self.opts.callbacks['after_sort'])
          _self.execCallbacks('after_sort');
      });

      //Start sorting initialy.
      if(i == 0 && _self.opts.auto_sorting) {
        $el.trigger('click');
      }
    });
  };

  _F.sort = function(options){
    options.order = options.dir == 'asc' ? 1 : -1;

    return this.getIndex().sort(this._sortingFunc(this.data, options));
  };

  _F._sortingFunc = function(data, options){
    var field = options.field, order = options.order, type = options.type;

    //return this.sortingFuntions[type];

    if (type ==  'number'){
      return function(i, j){
       return (data[i][field] - data[j][field]) * order;
      }
    }

    return function(i, j){
      var t1 = data[i][field].toLowerCase()
        ,t2 = data[j][field].toLowerCase();

      if (t1 < t2) return (-1 * order);
      if (t1 > t2) return (1 * order);
      return 0;
    }
  };

  _F.clear = function(){
    if (this.opts.search_box) { $(this.opts.search_box).html('')};
    $(this.main_container).html('');
  };

  StreamTable.extend = function (name, f ) {
    _StreamTable.prototype[name] = function () {
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

if (!Object.keys) {
  Object.keys = function(obj){
    var f, fields = [];
    for(f in obj) fields.push(f);
    return fields;
  }
}

