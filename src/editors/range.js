
Form.editors.Range = Form.editors.Base.extend({

	className: 'range',

	initialize: function (options) {
		this.value = [];
		
		Form.editors.Base.prototype.initialize.call( this, options );
	},
	
	render: function() {
		var html = '<input type="text"/><span> to </span><input type="text"/>';
		this.$el.html( html );
		
		Form.editors.Base.prototype.render.call( this );
		return this;
	},
	
	/**
	 * Sets the value of the form element
	 *
	 * @return Number[]
	 */
	getValue: function() {
		var inputs = this.$el.children('input');
		
		return [ inputs[0].value, inputs[1].value ];
	},
	
	/**
	 * Sets the value of the form element
	 *
	 * @param Number[]
	 */
	setValue: function (value) {
		if ( !value ) return;
		
		var inputs = this.$el.children('input');
		
		inputs[0].value = value[0];
		inputs[1].value = value[1];
	},
	
	focus: function() {
		if ( this.hasFocus) return;
		
		this.$el.children(':first-child').focus();
	},
	
	blur: function() {
		if ( !this.hasFocus) return;
		
		this.$el.children(':first-child').blur();
	},
	
	select: function() {
		this.$el.children(':first-child').select();
	}

});
