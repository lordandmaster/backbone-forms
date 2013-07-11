;(function(Form, Editor) {

  module('Text', {
    setup: function() {
      this.sinon = sinon.sandbox.create();
    },

    teardown: function() {
      this.sinon.restore();
    }
  });

  var Model = Backbone.Model.extend({
    schema: {
      enabled: { type: 'Text' }
    }
  });

  module('Text#initialize');

  test('Default type is text', function() {
    var editor = new Editor().render();
    deepEqual(editor.getValue(), '');
  });

  test('Type can be changed', function() {
    var editor = new Editor({
      value: 'tel'
    }).render();
    console.log(editor.getValue());
    deepEqual(editor.getValue(),'tel');
  });



  module('Text#getValue()');

  test('Default value', function() {
    var editor = new Editor().render();

    equal(editor.getValue(), '');
  });

  test('Custom value', function() {
    var editor = new Editor({
      value: 'Test'
    }).render();

    equal(editor.getValue(), 'Test');
  });

  test('Value from model', function() {
    var editor = new Editor({
      model: new Backbone.Model({ title: 'Danger Zone!' }),
      key: 'title'
    }).render();

    equal(editor.getValue(), 'Danger Zone!');
  });



  module('Text#setValue');

  test('updates the input value', function() {
    var editor = new Editor({
      key: 'title'
    }).render();

    editor.setValue('foobar');

    deepEqual(editor.getValue(), 'foobar');
    deepEqual($(editor.el).children().val(), 'foobar');

  });



  module('Text#focus', {
    setup: function() {
      this.sinon = sinon.sandbox.create();

      this.editor = new Editor().render();

      //jQuery events only triggered when element is on the page
      //TODO: Stub methods so we don't need to add to the page
      $('body').append(this.editor.el);
    },

    teardown: function() {
      this.sinon.restore();
      
      //Remove the editor from the page
      this.editor.remove();
    }
  });

  test('gives focus to editor and its input', function() {
    this.editor.focus();

    ok(this.editor.hasFocus);
    ok(this.editor.$el.children().is(':focus'));
  });

  test('triggers the "focus" event', function() {
    var editor = this.editor;
    var spy = this.sinon.spy();

    editor.on('focus', spy);

    editor.focus();

    ok(spy.called);
    ok(spy.calledWith(editor));
  });



  module('Text#blur', {
    setup: function() {
      this.sinon = sinon.sandbox.create();

      this.editor = new Editor().render();

      $('body').append(this.editor.el);
    },

    teardown: function() {
      this.sinon.restore();

      this.editor.remove();
    }
  });

  test('removes focus from the editor and its input', function() {
    var editor = this.editor;

    editor.focus();

    editor.blur();

    ok(!editor.hasFocus);
    ok(!editor.$el.is(':focus'));
  });

  test('triggers the "blur" event', function() {
    var editor = this.editor;

    editor.focus()

    var spy = this.sinon.spy();

    editor.on('blur', spy);

    editor.$el.children().blur();

    ok(spy.called);
    ok(spy.calledWith(editor));
  });



  module('Text#select', {
    setup: function() {
      this.sinon = sinon.sandbox.create();

      this.editor = new Editor().render();

      $('body').append(this.editor.el);
    },

    teardown: function() {
      this.sinon.restore();

      this.editor.remove();
    }
  });

  test('triggers the "select" event', function() {
    var editor = this.editor;

    var spy = this.sinon.spy();

    editor.on('select', spy);

    editor.select();

    ok(spy.called);
    ok(spy.calledWith(editor));
  });



  module('Text events', {
    setup: function() {
      this.sinon = sinon.sandbox.create();

      this.editor = new Editor().render();

      $('body').append(this.editor.el);
    },

    teardown: function() {
      this.sinon.restore();

      this.editor.remove();
    }
  });

  test("'change' event - is triggered when value of input changes", function() {
    var editor = this.editor;

    var callCount = 0;

    var spy = this.sinon.spy();

    editor.on('change', spy);

    // Pressing a key
    editor.$el.children().keypress();
    editor.$el.children().val('a');

    stop();
    setTimeout(function(){
      callCount++;

      editor.$el.children().keyup();

      // Keeping a key pressed for a longer time
      editor.$el.children().keypress();
      editor.$el.children().val('ab');

      setTimeout(function(){
        callCount++;
      
        editor.$el.children().keypress();
        editor.$el.children().val('abb');

        setTimeout(function(){
          callCount++;

          editor.$el.children().keyup();

          // Cmd+A; Backspace: Deleting everything
          editor.$el.children().keyup();
          editor.$el.children().val('');
          editor.$el.children().keyup();
          callCount++;

          // Cmd+V: Pasting something
          editor.$el.children().val('abdef');
          editor.$el.children().keyup();
          callCount++;

          // Left; Right: Pointlessly moving around
          editor.$el.children().keyup();
          editor.$el.children().keyup();
          
          ok(spy.callCount == callCount);
          ok(spy.alwaysCalledWith(editor));

          start();
        }, 0);
      }, 0);
    }, 0);
  });

  test("'focus' event - bubbles up from the input", function() {
    var editor = this.editor;

    var spy = this.sinon.spy();

    editor.on('focus', spy);

    editor.$el.children().focus();

    ok(spy.calledOnce);
    ok(spy.alwaysCalledWith(editor));
  });

  test("'blur' event - bubbles up from the input", function() {
    var editor = this.editor;

    editor.$el.focus();

    var spy = this.sinon.spy();

    editor.on('blur', spy);

    editor.$el.children().blur();

    ok(spy.calledOnce);
    ok(spy.alwaysCalledWith(editor));
  });

  test("'select' event - bubbles up from the input", function() {
    var editor = this.editor;

    var spy = this.sinon.spy();

    editor.on('select', spy);

    editor.$el.children().select();

    ok(spy.calledOnce);
    ok(spy.alwaysCalledWith(editor));
  });


})(Backbone.Form, Backbone.Form.editors.Text);
