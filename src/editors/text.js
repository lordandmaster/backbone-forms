/**
 * Text
 * 
 * Text input with focus, blur and change events
 */
Form.editors.Text = Form.Editor.extend({

  tagName: 'li',

  defaultValue: '',

  previousValue: '',

  events: {
    'keyup input[type=text]': 'determineChange',
    'keypress input[type=text]': function(event) {
      var self = this;
      setTimeout(function() {
        self.determineChange();
      }, 0);
    },
    'select input[type=text]':   function(event) {
      this.trigger('select', this);
    },
    'focus input[type=text]':    function(event) {
      this.trigger('focus', this);
    },
    'blur input[type=text]':     function(event) {
      this.trigger('blur', this);
    }
  },

  $inel: null,

  getInputElement: function() {
    return this.$el.find('input[type="text"]');
  },

  initialize: function(options) {
    Form.editors.Base.prototype.initialize.call(this, options);
    this.$inel = this.getInputElement();

    var schema = this.schema;

    //Allow customising text type (email, phone etc.) for HTML5 browsers
    var type = 'text';

    if (schema && schema.editorAttrs && schema.editorAttrs.type) type = schema.editorAttrs.type;
    if (schema && schema.dataType) type = schema.dataType;

    this.getInputElement().attr('type', 'text');
  },

  /**
   * Adds the editor to the DOM
   */
  render: function() {
    this.$el.html( this.template({ type:'text' }) );
    this.setValue(this.value);

    return this;
  },

  determineChange: function(event) {
    console.log(this.previousValue);
    var currentValue = this.getInputElement().val();
    var changed = (currentValue !== this.previousValue);

    if (changed) {
      this.previousValue = currentValue;

      this.trigger('change', this);
    }
  },

  /**
   * Returns the current editor value
   * @return {String}
   */
  getValue: function() {

    return this.getInputElement().val();
  },

  /**
   * Sets the value of the form element
   * @param {String}
   */
  setValue: function(value) {
    this.getInputElement().val(value);
  },

  focus: function() { 
    if (this.hasFocus) return;

    this.getInputElement().focus();
  },

  blur: function() {
    if (!this.hasFocus) return;
    this.getInputElement().blur();
  },

  select: function() {
    this.getInputElement().select();
  }

});
