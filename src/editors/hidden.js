/**
 * Hidden editor
 */
Form.editors.Hidden = Form.editors.Base.extend({

  defaultValue: '',
  
  $inel: null,

  getInputElement: function() {
    return this.$el.find('input[type="hidden"]');
  },

  initialize: function(options) {
    Form.editors.Text.prototype.initialize.call(this, options);

    this.$inel = this.getInputElement();

    this.getInputElement().attr('type', 'hidden');
  },

  focus: function() {
  	console.log("focus was called");
  	if(this.hasFocus) return; 
  		this.getInputElement().focus();
  },

  blur: function() {
  	console.log("blur was called");
  	if(!this.hasFocus) return;
  	this.getInputElement().blur();
  }

});
