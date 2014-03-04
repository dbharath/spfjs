/**
 * @fileoverview Tests for dynamically loading scripts.
 */

goog.require('spf.array');
goog.require('spf.net.resourcebeta');
goog.require('spf.net.scriptbeta');
goog.require('spf.pubsub');
goog.require('spf.url');


describe('spf.net.scriptbeta', function() {

  var callbacks;
  var fakes;
  var nodes;
  var js = spf.net.resourcebeta.Type.JS;
  var loading = spf.net.resourcebeta.Status.LOADING;
  var loaded = spf.net.resourcebeta.Status.LOADED;

  beforeEach(function() {
    jasmine.Clock.useMock();
    callbacks = {
      one: jasmine.createSpy('one'),
      two: jasmine.createSpy('two'),
      three: jasmine.createSpy('three'),
      four: jasmine.createSpy('four')
    };
    fakes = {
      // Replace DOM-based functions with fakes.
      url: {
        absolute: function(relative) {
          if (relative.indexOf('//') > -1) {
            return relative;
          } else if (relative.indexOf('/') == 0) {
            return '//test' + relative;
          } else {
            return '//test/' + relative;
          }
        }
      },
      resourcebeta: {
        create: function(type, url, opt_callback, opt_document) {
          url = spf.net.resourcebeta.canonicalize(js, url);
          var el = {
            setAttribute: function(n, v) {
              el[n] = v;
            },
            getAttribute: function(n) {
              return el[n];
            }
          };
          el.src = url;
          el.className = type + '-' + url.replace(/[^\w]/g, '');
          nodes.push(el);
          spf.net.resourcebeta.stats_[url] = loaded;
          opt_callback && opt_callback();
          return el;
        },
        destroy: function(type, url) {
          var idx = -1;
          spf.array.every(nodes, function(n, i, arr) {
            if (n.src == url) {
              idx = i;
              return false;
            }
            return true;
          });
          nodes.splice(idx, 1);
          delete spf.net.resourcebeta.stats_[url];
        }
      }
    };
    spyOn(spf.url, 'absolute').andCallFake(fakes.url.absolute);
    spyOn(spf.net.resourcebeta, 'create').andCallFake(
        fakes.resourcebeta.create);
    spyOn(spf.net.resourcebeta, 'destroy').andCallFake(
        fakes.resourcebeta.destroy);
    spf.state.values_ = {};
    spf.pubsub.subscriptions = {};
    spf.net.scriptbeta.urls_ = {};
    spf.net.scriptbeta.deps_ = {};
    spf.net.resourcebeta.urls_ = {};
    spf.net.resourcebeta.stats_ = {};
    nodes = [];
    for (var i = 1; i < 9; i++) {
      window['_global_' + i + '_'] = undefined;
    }
  });

  describe('load', function() {

    it('single url', function() {
      spf.net.scriptbeta.load('url-a.js');
      jasmine.Clock.tick(1);
      expect(nodes.length).toEqual(1);
      spf.net.scriptbeta.load('url-a.js', callbacks.one);
      jasmine.Clock.tick(1);
      spf.net.scriptbeta.load('url-a.js', callbacks.one);
      jasmine.Clock.tick(1);
      expect(nodes.length).toEqual(1);
      expect(callbacks.one.calls.length).toEqual(2);
      spf.net.scriptbeta.load('url-b.js', callbacks.two);
      jasmine.Clock.tick(1);
      expect(nodes.length).toEqual(2);
      expect(callbacks.one.calls.length).toEqual(2);
      expect(callbacks.two.calls.length).toEqual(1);
    });

    it('single url with name', function() {
      spf.net.scriptbeta.load('url-a.js', 'a');
      jasmine.Clock.tick(1);
      expect(nodes.length).toEqual(1);
      spf.net.scriptbeta.load('url-a.js', 'a', callbacks.one);
      jasmine.Clock.tick(1);
      spf.net.scriptbeta.load('url-a.js', 'a', callbacks.one);
      jasmine.Clock.tick(1);
      expect(nodes.length).toEqual(1);
      expect(callbacks.one.calls.length).toEqual(2);
      spf.net.scriptbeta.load('url-b.js', 'b', callbacks.two);
      jasmine.Clock.tick(1);
      expect(nodes.length).toEqual(2);
      expect(callbacks.one.calls.length).toEqual(2);
      expect(callbacks.two.calls.length).toEqual(1);
    });

    it('multiple urls', function() {
      spf.net.scriptbeta.load(['url-a-1.js', 'url-a-2.js']);
      jasmine.Clock.tick(1);
      expect(nodes.length).toEqual(2);
      spf.net.scriptbeta.load(['url-a-1.js', 'url-a-2.js'], callbacks.one);
      jasmine.Clock.tick(1);
      spf.net.scriptbeta.load(['url-a-1.js', 'url-a-2.js'], callbacks.one);
      jasmine.Clock.tick(1);
      expect(nodes.length).toEqual(2);
      expect(callbacks.one.calls.length).toEqual(2);
      spf.net.scriptbeta.load(['url-b-1.js', 'url-b-2.js'], callbacks.two);
      jasmine.Clock.tick(1);
      expect(nodes.length).toEqual(4);
      expect(callbacks.one.calls.length).toEqual(2);
      expect(callbacks.two.calls.length).toEqual(1);
    });

    it('multiple urls with name', function() {
      spf.net.scriptbeta.load(['url-a-1.js', 'url-a-2.js'], 'a');
      jasmine.Clock.tick(1);
      expect(nodes.length).toEqual(2);
      spf.net.scriptbeta.load(['url-a-1.js', 'url-a-2.js'], 'a', callbacks.one);
      jasmine.Clock.tick(1);
      spf.net.scriptbeta.load(['url-a-1.js', 'url-a-2.js'], 'a', callbacks.one);
      jasmine.Clock.tick(1);
      expect(nodes.length).toEqual(2);
      expect(callbacks.one.calls.length).toEqual(2);
      spf.net.scriptbeta.load(['url-b-1.js', 'url-b-2.js'], 'b', callbacks.two);
      jasmine.Clock.tick(1);
      expect(nodes.length).toEqual(4);
      expect(callbacks.one.calls.length).toEqual(2);
      expect(callbacks.two.calls.length).toEqual(1);
    });

  });

  describe('unload', function() {

    it('single url by name', function() {
      // Load a URL (and check that it is "ready").
      spf.net.scriptbeta.load('url-a.js', 'a');
      var result = spf.array.map(nodes, function(a) { return a.src; });
      expect(result).toContain('//test/url-a.js');
      spf.net.scriptbeta.ready('a', callbacks.one);
      jasmine.Clock.tick(1);
      expect(callbacks.one.calls.length).toEqual(1);
      // Unload it (and check that it is no longer "ready").
      spf.net.scriptbeta.unload('a');
      result = spf.array.map(nodes, function(a) { return a.src; });
      expect('//test/url-a.js' in spf.net.resourcebeta.stats_).toBe(false);
      expect(result).not.toContain('//test/url-a.js');
      spf.net.scriptbeta.ready('a', callbacks.one);
      jasmine.Clock.tick(1);
      expect(callbacks.one.calls.length).toEqual(1);
      // Repeated calls should be no-ops.
      spf.net.scriptbeta.unload('a');
      spf.net.scriptbeta.unload('a');
      result = spf.array.map(nodes, function(a) { return a.src; });
      expect('//test/url-a.js' in spf.net.resourcebeta.stats_).toBe(false);
      expect(result).not.toContain('//test/url-a.js');
      spf.net.scriptbeta.ready('a', callbacks.one);
      jasmine.Clock.tick(1);
      expect(callbacks.one.calls.length).toEqual(1);
    });

    it('multiple urls by name', function() {
      // Load some URLs (and check that they are "ready").
      spf.net.scriptbeta.load(['url-a-1.js', 'url-a-2.js'], 'a');
      var result = spf.array.map(nodes, function(a) { return a.src; });
      expect(result).toContain('//test/url-a-1.js');
      expect(result).toContain('//test/url-a-2.js');
      spf.net.scriptbeta.ready('a', callbacks.one);
      jasmine.Clock.tick(1);
      expect(callbacks.one.calls.length).toEqual(1);
      // Remove them (and check that they are no longer "ready").
      spf.net.scriptbeta.unload('a');
      result = spf.array.map(nodes, function(a) { return a.src; });
      expect('//test/url-a-1.js' in spf.net.resourcebeta.stats_).toBe(false);
      expect('//test/url-a-2.js' in spf.net.resourcebeta.stats_).toBe(false);
      expect(result).not.toContain('//test/url-a-1.js');
      expect(result).not.toContain('//test/url-a-2.js');
      spf.net.scriptbeta.ready('a', callbacks.one);
      jasmine.Clock.tick(1);
      expect(callbacks.one.calls.length).toEqual(1);
      // Repeated calls should be no-ops.
      spf.net.scriptbeta.unload('a');
      spf.net.scriptbeta.unload('a');
      result = spf.array.map(nodes, function(a) { return a.src; });
      expect('//test/url-a-1.js' in spf.net.resourcebeta.stats_).toBe(false);
      expect('//test/url-a-2.js' in spf.net.resourcebeta.stats_).toBe(false);
      expect(result).not.toContain('//test/url-a-1.js');
      expect(result).not.toContain('//test/url-a-2.js');
      expect(callbacks.one.calls.length).toEqual(1);
      // Check multiple names.
      spf.net.scriptbeta.load(['url-a-1.js', 'url-a-2.js'], 'a');
      spf.net.scriptbeta.load(['url-b-1.js', 'url-b-2.js'], 'b');
      var result = spf.array.map(nodes, function(a) { return a.src; });
      expect(result).toContain('//test/url-a-1.js');
      expect(result).toContain('//test/url-a-2.js');
      expect(result).toContain('//test/url-b-1.js');
      expect(result).toContain('//test/url-b-2.js');
      jasmine.Clock.tick(1);
      expect(callbacks.one.calls.length).toEqual(2);
      spf.net.scriptbeta.unload('b');
      result = spf.array.map(nodes, function(a) { return a.src; });
      expect(result).toContain('//test/url-a-1.js');
      expect(result).toContain('//test/url-a-2.js');
      expect(result).not.toContain('//test/url-b-1.js');
      expect(result).not.toContain('//test/url-b-2.js');
      spf.net.scriptbeta.unload('a');
      result = spf.array.map(nodes, function(a) { return a.src; });
      expect(result).not.toContain('//test/url-a-1.js');
      expect(result).not.toContain('//test/url-a-2.js');
      expect(result).not.toContain('//test/url-b-1.js');
      expect(result).not.toContain('//test/url-b-2.js');
      expect(callbacks.one.calls.length).toEqual(2);
    });

    it('multiple urls by name with cross dependencies', function() {
      spf.net.scriptbeta.load(['url-a.js', 'url-b.js'], 'foo');
      spf.net.scriptbeta.load(['url-a.js', 'url-c.js'], 'bar');
      jasmine.Clock.tick(1);
      spf.net.scriptbeta.ready('foo', callbacks.one);
      spf.net.scriptbeta.ready('bar', callbacks.two);
      expect(callbacks.one.calls.length).toEqual(1);
      expect(callbacks.two.calls.length).toEqual(1);
      // Unloading bar makes foo no longer "ready" because both have url-a.js.
      spf.net.scriptbeta.unload('bar');
      spf.net.scriptbeta.ready('foo', callbacks.one);
      spf.net.scriptbeta.ready('bar', callbacks.two);
      expect(callbacks.one.calls.length).toEqual(1);
      expect(callbacks.two.calls.length).toEqual(1);
    });

  });

  describe('ready', function() {

    it('waits to execute callbacks on a single dependency', function() {
      // Check pre-ready.
      spf.net.scriptbeta.ready('my:foo', callbacks.one);
      expect(callbacks.one.calls.length).toEqual(0);
      // Load.
      spf.net.scriptbeta.load('foo.js', 'my:foo');
      // Check post-ready.
      expect(callbacks.one.calls.length).toEqual(1);
      // Check again.
      spf.net.scriptbeta.ready('my:foo', callbacks.two);
      expect(callbacks.one.calls.length).toEqual(1);
      expect(callbacks.two.calls.length).toEqual(1);
      spf.net.scriptbeta.ready('my:foo', callbacks.two);
      expect(callbacks.one.calls.length).toEqual(1);
      expect(callbacks.two.calls.length).toEqual(2);
    });

    it('waits to execute callbacks on multiple dependencies', function() {
      spf.net.scriptbeta.ready('my:foo', callbacks.one);
      spf.net.scriptbeta.ready('bar', callbacks.two);
      spf.net.scriptbeta.ready(['my:foo', 'bar'], callbacks.three);
      expect(callbacks.one.calls.length).toEqual(0);
      expect(callbacks.two.calls.length).toEqual(0);
      expect(callbacks.three.calls.length).toEqual(0);
      // Load first.
      spf.net.scriptbeta.load('foo.js', 'my:foo');
      // Check.
      expect(callbacks.one.calls.length).toEqual(1);
      expect(callbacks.two.calls.length).toEqual(0);
      expect(callbacks.three.calls.length).toEqual(0);
      // Load second.
      spf.net.scriptbeta.load('bar.js', 'bar');
      // Check.
      expect(callbacks.one.calls.length).toEqual(1);
      expect(callbacks.two.calls.length).toEqual(1);
      expect(callbacks.three.calls.length).toEqual(1);
      // Check again.
      spf.net.scriptbeta.ready('bar', callbacks.two);
      expect(callbacks.one.calls.length).toEqual(1);
      expect(callbacks.two.calls.length).toEqual(2);
      expect(callbacks.three.calls.length).toEqual(1);
      spf.net.scriptbeta.ready(['my:foo', 'bar'], callbacks.three);
      spf.net.scriptbeta.ready(['my:foo', 'bar'], callbacks.three);
      expect(callbacks.one.calls.length).toEqual(1);
      expect(callbacks.two.calls.length).toEqual(2);
      expect(callbacks.three.calls.length).toEqual(3);
    });

    it('executes require for missing dependencies', function() {
      spf.net.scriptbeta.ready('my:foo', null, callbacks.one);
      expect(callbacks.one.calls.length).toEqual(1);
      expect(callbacks.one.mostRecentCall.args[0]).toEqual(['my:foo']);
      // Load first.
      spf.net.scriptbeta.load('foo.js', 'my:foo');
      spf.net.scriptbeta.ready(['my:foo', 'bar'], null, callbacks.one);
      expect(callbacks.one.calls.length).toEqual(2);
      expect(callbacks.one.mostRecentCall.args[0]).toEqual(['bar']);
      // Load second.
      spf.net.scriptbeta.load('bar.js', 'bar');
      spf.net.scriptbeta.ready(['a', 'my:foo', 'b', 'bar', 'c'],
                               null, callbacks.one);
      expect(callbacks.one.calls.length).toEqual(3);
      expect(callbacks.one.mostRecentCall.args[0]).toEqual(['a', 'b', 'c']);
    });

  });

  describe('done', function() {

    it('registers completion', function() {
      spf.net.scriptbeta.done('foo');
      expect('foo' in spf.net.resourcebeta.urls_);
    });

    it('executes callbacks', function() {
      // Setup callbacks.
      spf.net.scriptbeta.ready('foo', callbacks.one);
      spf.net.scriptbeta.ready('bar', callbacks.two);
      // Register first.
      spf.net.scriptbeta.done('foo');
      expect(callbacks.one.calls.length).toEqual(1);
      expect(callbacks.two.calls.length).toEqual(0);
      // Register second.
      spf.net.scriptbeta.done('bar');
      expect(callbacks.one.calls.length).toEqual(1);
      expect(callbacks.two.calls.length).toEqual(1);
      // Repeat.
      spf.net.scriptbeta.ready('foo', callbacks.one);
      spf.net.scriptbeta.ready('bar', callbacks.two);
      expect(callbacks.one.calls.length).toEqual(2);
      expect(callbacks.two.calls.length).toEqual(2);
      // Extra.
      spf.net.scriptbeta.done('foo');
      spf.net.scriptbeta.done('foo');
      spf.net.scriptbeta.done('bar');
      expect(callbacks.one.calls.length).toEqual(2);
      expect(callbacks.two.calls.length).toEqual(2);
    });

  });

  describe('ignore', function() {

    it('does not execute callbacks for a single dependency', function() {
      spf.net.scriptbeta.ready('foo', callbacks.one);
      spf.net.scriptbeta.ignore('foo', callbacks.one);
      spf.net.scriptbeta.done('foo');
      expect(callbacks.one.calls.length).toEqual(0);
    });

    it('does not execute callbacks for multiple dependencies', function() {
      spf.net.scriptbeta.ready(['a', 'b', 'c'], callbacks.one);
      // Ensure a different ordering works.
      spf.net.scriptbeta.ignore(['c', 'b', 'a'], callbacks.one);
      spf.net.scriptbeta.done('a');
      spf.net.scriptbeta.done('b');
      spf.net.scriptbeta.done('c');
      expect(callbacks.one.calls.length).toEqual(0);
    });

  });

  describe('require', function() {

    it('loads declared dependencies', function() {
      spyOn(spf.net.scriptbeta, 'ready').andCallThrough();
      spf.net.scriptbeta.declare({
        'foo': null,
        'a': 'foo',
        'b': 'foo',
        'bar': ['a', 'b']
      });
      spf.net.scriptbeta.require('bar', callbacks.one);
      jasmine.Clock.tick(1);
      // Check ready ordering.
      expect(spf.net.scriptbeta.ready.calls.length).toEqual(4);
      expect(spf.net.scriptbeta.ready.calls[0].args[0]).toEqual(['bar']);
      expect(spf.net.scriptbeta.ready.calls[1].args[0]).toEqual(['a', 'b']);
      expect(spf.net.scriptbeta.ready.calls[2].args[0]).toEqual(['foo']);
      expect(spf.net.scriptbeta.ready.calls[3].args[0]).toEqual(['foo']);
      // Check load ordering.
      var result = spf.array.map(nodes, function(a) { return a.src; });
      expect(result).toEqual(['//test/foo.js', '//test/a.js',
                              '//test/b.js', '//test/bar.js']);
      // Check callback.
      expect(callbacks.one.calls.length).toEqual(1);
      // Repeat callback.
      spf.net.scriptbeta.require('bar', callbacks.one);
      expect(spf.net.scriptbeta.ready.calls.length).toEqual(5);
      expect(spf.net.scriptbeta.ready.calls[4].args[0]).toEqual(['bar']);
      expect(callbacks.one.calls.length).toEqual(2);
      // No callback.
      spf.net.scriptbeta.require('bar');
      expect(spf.net.scriptbeta.ready.calls.length).toEqual(6);
      expect(spf.net.scriptbeta.ready.calls[5].args[0]).toEqual(['bar']);
      expect(callbacks.one.calls.length).toEqual(2);
    });

    it('loads declared dependencies with path', function() {
      spf.net.scriptbeta.path('/dir/');
      spf.net.scriptbeta.declare({
        'foo': null,
        'a': 'foo',
        'b': 'foo',
        'bar': ['a', 'b']
      });
      spf.net.scriptbeta.require('bar', callbacks.one);
      jasmine.Clock.tick(1);
      // Check load ordering.
      var result = spf.array.map(nodes, function(a) { return a.src; });
      expect(result).toEqual(['//test/dir/foo.js', '//test/dir/a.js',
                              '//test/dir/b.js', '//test/dir/bar.js']);
      // Check callback.
      expect(callbacks.one.calls.length).toEqual(1);
    });

    it('loads declared dependencies with urls', function() {
      spf.net.scriptbeta.declare({
        'foo': null,
        'a': 'foo',
        'b': 'foo',
        'bar': ['a', 'b']
      }, {
        'foo': 'sbb.js',
        'a': 'n.js',
        'b': 'o.js',
        'bar': 'one.js'
      });
      spf.net.scriptbeta.require('bar', callbacks.one);
      jasmine.Clock.tick(1);
      // Check load ordering.
      var result = spf.array.map(nodes, function(a) { return a.src; });
      expect(result).toEqual(['//test/sbb.js', '//test/n.js',
                              '//test/o.js', '//test/one.js']);
      // Check callback.
      expect(callbacks.one.calls.length).toEqual(1);
    });

    it('loads declared dependencies with path and urls', function() {
      spf.net.scriptbeta.path('/dir/');
      spf.net.scriptbeta.declare({
        'foo': null,
        'a': 'foo',
        'b': 'foo',
        'bar': ['a', 'b']
      }, {
        'foo': 'sbb.js',
        'a': 'n.js',
        'b': 'o.js',
        'bar': 'one.js'
      });
      spf.net.scriptbeta.require('bar', callbacks.one);
      jasmine.Clock.tick(1);
      // Check load ordering.
      var result = spf.array.map(nodes, function(a) { return a.src; });
      expect(result).toEqual(['//test/dir/sbb.js', '//test/dir/n.js',
                              '//test/dir/o.js', '//test/dir/one.js']);
      // Check callback.
      expect(callbacks.one.calls.length).toEqual(1);
    });

  });

  describe('check', function() {

    it('executes pending callbacks', function() {
      // No dependencies.
      spf.pubsub.subscribe('js-foo', callbacks.one);
      spf.pubsub.subscribe('js-bar', callbacks.two);
      spf.pubsub.subscribe('js-foo|bar', callbacks.three);
      spf.pubsub.subscribe('js-other', callbacks.four);
      spf.net.scriptbeta.check();
      expect(callbacks.one.calls.length).toEqual(0);
      expect(callbacks.two.calls.length).toEqual(0);
      expect(callbacks.three.calls.length).toEqual(0);
      expect(callbacks.four.calls.length).toEqual(0);
      // Not loaded.
      spf.net.resourcebeta.urls_['js-foo'] = ['//test/f1.js', '//test/f2.js'];
      spf.net.resourcebeta.urls_['js-bar'] = ['//test/b.js'];
      spf.net.scriptbeta.check();
      expect(callbacks.one.calls.length).toEqual(0);
      expect(callbacks.two.calls.length).toEqual(0);
      expect(callbacks.three.calls.length).toEqual(0);
      expect(callbacks.four.calls.length).toEqual(0);
      // Some loading.
      spf.net.resourcebeta.stats_['//test/b.js'] = loading;
      spf.net.scriptbeta.check();
      expect(callbacks.one.calls.length).toEqual(0);
      expect(callbacks.two.calls.length).toEqual(0);
      expect(callbacks.three.calls.length).toEqual(0);
      expect(callbacks.four.calls.length).toEqual(0);
      // All loading.
      spf.net.resourcebeta.stats_['//test/b.js'] = loading;
      spf.net.resourcebeta.stats_['//test/f1.js'] = loading;
      spf.net.resourcebeta.stats_['//test/f2.js'] = loading;
      spf.net.scriptbeta.check();
      expect(callbacks.one.calls.length).toEqual(0);
      expect(callbacks.two.calls.length).toEqual(0);
      expect(callbacks.three.calls.length).toEqual(0);
      expect(callbacks.four.calls.length).toEqual(0);
      // Some loaded, some loading.
      spf.net.resourcebeta.stats_['//test/b.js'] = loaded;
      spf.net.resourcebeta.stats_['//test/f1.js'] = loading;
      spf.net.resourcebeta.stats_['//test/f2.js'] = loaded;
      spf.net.scriptbeta.check();
      expect(callbacks.one.calls.length).toEqual(0);
      expect(callbacks.two.calls.length).toEqual(1);
      expect(callbacks.three.calls.length).toEqual(0);
      expect(callbacks.four.calls.length).toEqual(0);
      // All loaded.
      spf.net.resourcebeta.stats_['//test/b.js'] = loaded;
      spf.net.resourcebeta.stats_['//test/f1.js'] = loaded;
      spf.net.resourcebeta.stats_['//test/f2.js'] = loaded;
      spf.net.scriptbeta.check();
      expect(callbacks.one.calls.length).toEqual(1);
      expect(callbacks.two.calls.length).toEqual(1);
      expect(callbacks.three.calls.length).toEqual(1);
      expect(callbacks.four.calls.length).toEqual(0);
    });

  });

  describe('eval', function() {

    it('standard', function() {
      expect(function() { spf.net.scriptbeta.eval(''); }).not.toThrow();
      var text = 'var _global_1_ = 1;';
      spf.net.scriptbeta.eval(text);
      expect(window['_global_1_']).toEqual(1);
    });

    it('strict', function() {
      var text = '"use strict";' +
          'var _global_2_ = 2;';
      spf.net.scriptbeta.eval(text);
      expect(window['_global_2_']).toEqual(2);
    });

    it('recursive standard', function() {
      text = 'var _global_3_ = 3;' +
          'spf.net.scriptbeta.eval("var _global_4_ = 4;");';
      spf.net.scriptbeta.eval(text);
      expect(window['_global_3_']).toEqual(3);
      expect(window['_global_4_']).toEqual(4);
    });

    it('recursive mixed', function() {
      text = 'var _global_5_ = 5;' +
          'spf.net.scriptbeta.eval("' +
          "'use strict';" +
          'var _global_6_ = 6;' +
          '");';
      spf.net.scriptbeta.eval(text);
      expect(window['_global_5_']).toEqual(5);
      expect(window['_global_6_']).toEqual(6);
    });

    it('recursive strict', function() {
      text = '"use strict";' +
          'var _global_7_ = 7;' +
          'spf.net.scriptbeta.eval("' +
          "'use strict';" +
          'var _global_8_ = 8;' +
          '");';
      spf.net.scriptbeta.eval(text);
      expect(window['_global_7_']).toEqual(7);
      expect(window['_global_8_']).toEqual(8);
    });

  });

});
