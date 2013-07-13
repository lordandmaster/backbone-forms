/**
 * Chosen editor
 *
 * Renders a Chosen.js selector with given options
 *
 * Requires an 'options' value on the schema.
 */
Form.editors.Chosen = Form.editors.Select.extend({
	
	initialize: function (options) {
		Form.editors.Select.prototype.initialize.call(this, options);
		
		if ( !this.$el.chosen ) {
			throw new Error('Chosen plugin not detected!');
		}
		
		this.$el.chosen( options.chosenOptions );
	},
	
	focus: function() {
		if (this.hasFocus) return;
		
		// Chosen hides the initial select element to which $el points, and
		// hidden elements do not support focus/blur behavior. Thus, we need
		// to only execute the handlers. Chosen does not implement blur/focus
		// handles?
		this.$el.triggerHandler('focus');
	},
	
	blur: function() {
		if (!this.hasFocus) return;
		
		// See comment in focus()
		this.$el.triggerHandler('blur');
	}
	
});