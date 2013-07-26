;(function(Form, Editor) {

  module('Range');

  var same = deepEqual;


  module('Range#getValue()');

  test('Default value', function() {
    var editor = new Editor().render();

    same(editor.getValue(), [null,null]);
  });

  test('Custom value', function() {
    var editor = new Editor({
      value: ['Test', 3.2]
    }).render();

    same(editor.getValue(), [null,3.2]);
  });

  /*test('Value from model', function() {
    var editor = new Editor({
      model: new Backbone.Model({ title: 'Danger Zone!' }),
      key: 'title'
    }).render();

    equal(editor.getValue(), 'Danger Zone!');
  });*/



  module('Range#setValue');

  test('updates the input value', function() {
    var editor = new Editor({
      key: 'title'
    }).render();

    editor.setValue([8.2, 8.3]);

    same(editor.getValue(), [8.2, 8.3]);
  });

	test('Re-render preserves value', function() {
		var editor = new Editor({
			value: [ 4, 10 ]
		}).render();
		
		editor.render().render();
		
		same(editor.getValue(), [4, 10]);
		
		editor.setValue([3,2]);
		editor.render();
		
		same(editor.getValue(), [3,2]);
	});



  module('Range#focus', {
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
    ok(this.editor.$('input:first').is(':focus'));
  });

  test('triggers the "focus" event', function() {
    var editor = this.editor,
        spy = this.sinon.spy();

    editor.on('focus', spy);

    editor.focus();

    ok(spy.called);
    ok(spy.calledWith(editor));
  });



  module('Range#blur', {
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
    ok(!editor.$('input:first').is(':focus'));
  });

  test('triggers the "blur" event', function() {
    var editor = this.editor;

    editor.focus()

    var spy = this.sinon.spy();

    editor.on('blur', spy);

    editor.blur();

    ok(spy.called);
    ok(spy.calledWith(editor));
  });

  test('triggers the "select" event', function() {
    var editor = this.editor;

    editor.focus()

    var spy = this.sinon.spy();

    editor.on('select', spy);

    editor.select();

    ok(spy.called);
    ok(spy.calledWith(editor));
  });



  module('range events', {
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

  /*test("'change' event - is triggered when value of input changes", function() {
    var editor = this.editor;

    var callCount = 0;

    var spy = this.sinon.spy();

    editor.on('change', spy);

    // Pressing a key
    editor.$('input:first').keypress();
    editor.$('input:first').val('a');

    stop();
    setTimeout(function(){
      callCount++;

      editor.$('input:first').keyup();

      // Keeping a key pressed for a longer time
      editor.$('input:first').keypress();
      editor.$('input:first').val('ab');

      setTimeout(function(){
        callCount++;

        editor.$('input:first').keypress();
        editor.$('input:first').val('abb');

        setTimeout(function(){
          callCount++;

          editor.$('input:first').keyup();

          // Cmd+A; Backspace: Deleting everything
          editor.$('input:first').keyup();
          editor.$('input:first').val('');
          editor.$('input:first').keyup();
          callCount++;

          // Cmd+V: Pasting something
          editor.$('input:first').val('abdef');
          editor.$('input:first').keyup();
          callCount++;

          // Left; Right: Pointlessly moving around
          editor.$('input:first').keyup();
          editor.$('input:first').keyup();

          ok(spy.callCount == callCount);
          ok(spy.alwaysCalledWith(editor));

          start();
        }, 0);
      }, 0);
    }, 0);
  });*/

  test("'focus' event - bubbles up from the input", function() {
    var editor = this.editor;

    var spy = this.sinon.spy();

    editor.on('focus', spy);

    editor.$('input:first').focus();

    ok(spy.calledOnce);
    ok(spy.alwaysCalledWith(editor));
  });

  test("'blur' event - bubbles up from the input", function() {
    var editor = this.editor;

    editor.$('input:first').focus();

    var spy = this.sinon.spy();

    editor.on('blur', spy);

    editor.$('input:first').blur();

    ok(spy.calledOnce);
    ok(spy.alwaysCalledWith(editor));
  });

  test("'select' event - bubbles up from the input", function() {
    var editor = this.editor;

    var spy = this.sinon.spy();

    editor.on('select', spy);

    editor.$('input:first').select();

    ok(spy.calledOnce);
    ok(spy.alwaysCalledWith(editor));
  });


})(Backbone.Form, Backbone.Form.editors.Range);
