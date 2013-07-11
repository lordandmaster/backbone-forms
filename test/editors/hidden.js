;(function(Form, Editor) {

  module('Hidden', {
    setup: function() {
      this.sinon = sinon.sandbox.create();
    },

    teardown: function() {
      this.sinon.restore();
    }
  });

  var Model = Backbone.Model.extend({
    schema: {
      enabled: { type: 'Hidden' }
    }
  });

  //module('Hidden#initialize');

  test('Default value', function() {
    var editor = new Editor().render();

    deepEqual(editor.getValue(), '');
  });
  
  test('sets input type', function() {
    var editor = new Editor();
    console.log(editor);
    editor.
    deepEqual(editor.attr('type'), 'hidden');
  });

})(Backbone.Form, Backbone.Form.editors.Hidden);
