;(function(Form, Editor) {

	module('Hidden#initialize');

	test('sets input type', function() {
		var editor = new Editor();
	
		equal(editor.$el.attr('type'), 'hidden');
	});

	test('Default value', function() {
		var editor = new Editor().render();

		deepEqual(editor.getValue(), '');
	});
	
})(Backbone.Form, Backbone.Form.editors.Hidden);
