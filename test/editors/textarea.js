;(function(Form, Editor) {

  module('TextArea');

  var same = deepEqual;


  module('TextArea#initialize');

  test('sets tag type', function() {
    var editor = new Editor();

    ok(editor.$el.is('textarea'));
  });

	test('Re-render preserves value', function() {
		var editor = new Editor({
			value: 'Lana'
		}).render();
		
		editor.render().render();
		
		same(editor.getValue(), 'Lana');
		
		editor.setValue('Pam');
		editor.render();
		
		same(editor.getValue(), 'Pam');
	});


})(Backbone.Form, Backbone.Form.editors.TextArea);
