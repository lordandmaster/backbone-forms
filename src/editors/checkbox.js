/**
 * Checkbox editor
 *
 * Creates a single checkbox, i.e. boolean value
 */
Form.editors.Checkbox = Form.editors.Base.extend({

  defaultValue: false,
  tagName: 'li',

  events: {
    'click input[type=checkbox]':  function(event) {
      this.trigger('change', this);
    },
    'focus input[type=checkbox]':  function(event) {
      this.trigger('focus', this);
    },
    'blur input[type=checkbox]':   function(event) {
      this.trigger('blur', this);
    }
  },
  
  $inel: null,
  
  getInputElement: function() {
	return this.$el.find('input[type="checkbox"]');
  },

  initialize: function(options) {
    Form.editors.Base.prototype.initialize.call(this, options);
	this.$inel = this.getInputElement();

    this.getInputElement().attr('type', 'checkbox');
  },

  /**
   * Adds the editor to the DOM
   */
  render: function() {
	this.$el.html( this.template() );
    this.setValue(this.value);

    return this;
  },

  getValue: function() {
    return this.getInputElement().prop('checked');
  },

  setValue: function(value) {
    if (value) {
      this.getInputElement().prop('checked', true);
    }
  },

  focus: function() {
    if (this.hasFocus) return;

    this.getInputElement().focus();
  },

  blur: function() {
    if (!this.hasFocus) return;

    this.getInputElement().blur();
  }

});
