/**
 * Fork yii2-dynamic-form Wanderson Bragança
 * v1.0.6
 */
function initTemplate(widgetOptions, template) {
    var yiiActiveFormData = $('#' + widgetOptions.formId).yiiActiveForm('data');

    // Opera, Safari error.
    if (typeof yiiActiveFormData !== 'undefined') {
        template.find('.' + yiiActiveFormData.settings.errorCssClass).removeClass(yiiActiveFormData.settings.errorCssClass);
        template.find('.' + yiiActiveFormData.settings.successCssClass).removeClass(yiiActiveFormData.settings.successCssClass);
    }

    return template;
}

(function ($) {
    var pluginName = 'yiiDynamicForm';

    var regexID = /^(.+?)([-\d-]{1,})(.+)$/i;

    var regexName = /(^.+?)([\[\d{1,}\]]{1,})(\[.+\]$)/i;

    $.fn.yiiDynamicForm = function (method) {
        if (methods[method]) {
            return methods[method].apply(this, Array.prototype.slice.call(arguments, 1));
        } else if (typeof method === 'object' || !method) {
            return methods.init.apply(this, arguments);
        } else {
            $.error('Method ' + method + ' does not exist on jQuery.yiiDynamicForm');
            return false;
        }
    };

    var events = {
        beforeInsert: 'beforeInsert',
        afterInsert: 'afterInsert',
        beforeDelete: 'beforeDelete',
        afterDelete: 'afterDelete',
        limitReached: 'limitReached'
    };

    var methods = {
        init: function (widgetOptions) {
            return this.each(function () {
                widgetOptions.template = _parseTemplate(widgetOptions);
            });
        },

        addItem: function (widgetOptions, e, $elem) {
            _addItem(widgetOptions, e, $elem);
        },

        deleteItem: function (widgetOptions, e, $elem) {
            _deleteItem(widgetOptions, e, $elem);
        },

        updateContainer: function () {
            var widgetOptions = eval($(this).attr('data-dynamicform'));
            _updateAttributes(widgetOptions);
            _fixFormValidaton(widgetOptions);
        }
    };

    var _parseTemplate = function(widgetOptions) {

        var $template = $(widgetOptions.template);
        $template.find('div[data-dynamicform]').each(function(){
            var widgetOptions = eval($(this).attr('data-dynamicform'));
            if ($(widgetOptions.widgetItem).length > 1) {
                var item = $(this).find(widgetOptions.widgetItem).first()[0].outerHTML;
                $(this).find(widgetOptions.widgetBody).html(item);
            }
        });

        $template.find('input, textarea, select').each(function() {
            if ($(this).is(':checkbox') || $(this).is(':radio')) {
                var type         = ($(this).is(':checkbox')) ? 'checkbox' : 'radio';
                var inputName    = $(this).attr('name');
                var $inputHidden = $template.find('input[type="hidden"][name="' + inputName + '"]').first();
                var count        = $template.find('input[type="' + type +'"][name="' + inputName + '"]').length;

                if ($inputHidden && count === 1) {
                    $(this).val(1);
                    $inputHidden.val(0);
                }

                $(this).prop('checked', false);
            } else if($(this).is('select')) {
                $(this).find('option:selected').removeAttr("selected");
            } else {
                $(this).val('');
            }
        });

        // remove "error/success" css class
        return initTemplate(widgetOptions, $template);
    };

    var _getWidgetOptionsRoot = function(widgetOptions) {
        return eval($(widgetOptions.widgetBody).parents('div[data-dynamicform]').last().attr('data-dynamicform'));
    };

    var _getLevel = function($elem) {
        var level = $elem.parents('div[data-dynamicform]').length;
        level = (level < 0) ? 0 : level;
        return level;
    };

    var _count = function($elem, widgetOptions) {
        return $elem.closest('.' + widgetOptions.widgetContainer).find(widgetOptions.widgetItem).length;
    };

    var _createIdentifiers = function(level) {
        return new Array(level + 2).join('0').split('');
    };

    var _addItem = function(widgetOptions, e, $elem) {
        var count = _count($elem, widgetOptions);

        if (count < widgetOptions.limit) {
            $toclone = $(widgetOptions.template);
            $newclone = $toclone.clone(false, false);

            if (widgetOptions.insertPosition === 'top') {
                $elem.closest('.' + widgetOptions.widgetContainer).find(widgetOptions.widgetBody).prepend($newclone);
            } else {
                $elem.closest('.' + widgetOptions.widgetContainer).find(widgetOptions.widgetBody).append($newclone);
            }

            _updateAttributes(widgetOptions);
            _fixFormValidaton(widgetOptions);
            $elem.closest('.' + widgetOptions.widgetContainer).triggerHandler(events.afterInsert, $newclone);
        } else {
            // trigger a custom event for hooking
            $elem.closest('.' + widgetOptions.widgetContainer).triggerHandler(events.limitReached, widgetOptions.limit);
        }
    };

    var _removeValidations = function($elem, widgetOptions, count) {
        if (count > 1) {
            $elem.find('div[data-dynamicform]').each(function() {
                var currentWidgetOptions = eval($(this).attr('data-dynamicform'));
                var level           = _getLevel($(this));
                var identifiers     = _createIdentifiers(level);
                var numItems        = $(this).find(currentWidgetOptions.widgetItem).length;

                for (var i = 1; i <= numItems -1; i++) {
                    var aux = identifiers;
                    aux[level] = i;
                    currentWidgetOptions.fields.forEach(function(input) {
                        var id = input.id.replace("{}", aux.join('-'));
                        if ($("#" + currentWidgetOptions.formId).yiiActiveForm("find", id) !== "undefined") {
                            $("#" + currentWidgetOptions.formId).yiiActiveForm("remove", id);
                        }
                    });
                }
            });

            var level          = _getLevel($elem.closest('.' + widgetOptions.widgetContainer));
            var widgetOptionsRoot       = _getWidgetOptionsRoot(widgetOptions);
            var identifiers    = _createIdentifiers(level);
            identifiers[0]     = $(widgetOptionsRoot.widgetItem).length - 1;
            identifiers[level] = count - 1;

            widgetOptions.fields.forEach(function(input) {
                var id = input.id.replace("{}", identifiers.join('-'));
                if ($("#" + widgetOptions.formId).yiiActiveForm("find", id) !== "undefined") {
                    $("#" + widgetOptions.formId).yiiActiveForm("remove", id);
                }
            });
        }
    };

    var _deleteItem = function(widgetOptions, e, $elem) {
        var count = _count($elem, widgetOptions);

        if (count > widgetOptions.min) {
            $todelete = $elem.closest(widgetOptions.widgetItem);

            // trigger a custom event for hooking
            var eventResult = $('.' + widgetOptions.widgetContainer).triggerHandler(events.beforeDelete, $todelete);
            if (eventResult !== false) {
                _removeValidations($todelete, widgetOptions, count);
                $todelete.remove();
                _updateAttributes(widgetOptions);
                _fixFormValidaton(widgetOptions);
                $('.' + widgetOptions.widgetContainer).triggerHandler(events.afterDelete);
            }
        }
    };

    var _updateAttrID = function($elem, index) {
        var widgetOptions = eval($elem.closest('div[data-dynamicform]').attr('data-dynamicform'));
        var id            = $elem.attr('id');
        var newID         = id;

        if (id !== undefined) {
            var matches = id.match(regexID);
            if (matches && matches.length === 4) {
                matches[2] = matches[2].substring(1, matches[2].length - 1);
                var identifiers = matches[2].split('-');
                identifiers[0] = index;

                if (identifiers.length > 1) {
                    var widgetsOptions = [];
                    $elem.parents('div[data-dynamicform]').each(function(i){
                        widgetsOptions[i] = eval($(this).attr('data-dynamicform'));
                    });

                    widgetsOptions = widgetsOptions.reverse();
                    for (var i = identifiers.length - 1; i >= 1; i--) {
                        if (typeof widgetsOptions[i] !== 'undefined') {
                            identifiers[i] = $elem.closest(widgetsOptions[i].widgetItem).index();
                        }
                    }
                }

                newID = matches[1] + '-' + identifiers.join('-') + '-' + matches[3];
                $elem.attr('id', newID);
            } else {
                newID = id + index;
                $elem.attr('id', newID);
            }
        }

        if (id !== newID) {
            $elem.closest(widgetOptions.widgetItem).find('.field-' + id).each(function() {
                $(this).removeClass('field-' + id).addClass('field-' + newID);
            });
            // update "for" attribute
            $elem.closest(widgetOptions.widgetItem).find("label[for='" + id + "']").attr('for',newID);
        }

        return newID;
    };

    var _updateAttrName = function($elem, index) {
        var name = $elem.attr('name');

        if (name !== undefined) {
            var matches = name.match(regexName);

            if (matches && matches.length === 4) {
                matches[2] = matches[2].replace(/\]\[/g, "-").replace(/\]|\[/g, '');
                var identifiers = matches[2].split('-');
                identifiers[0] = index;

                if (identifiers.length > 1) {
                    var widgetsOptions = [];
                    $elem.parents('div[data-dynamicform]').each(function(i){
                        widgetsOptions[i] = eval($(this).attr('data-dynamicform'));
                    });

                    widgetsOptions = widgetsOptions.reverse();
                    for (var i = identifiers.length - 1; i >= 1; i--) {
                        if (typeof widgetsOptions[i] !== 'undefined') {
                            identifiers[i] = $elem.closest(widgetsOptions[i].widgetItem).index();
                        }
                    }
                }

                name = matches[1] + '[' + identifiers.join('][') + ']' + matches[3];
                $elem.attr('name', name);
            }
        }

        return name;
    };

    var _updateAttributes = function(widgetOptions) {
        var widgetOptionsRoot = _getWidgetOptionsRoot(widgetOptions);

        $(widgetOptionsRoot.widgetItem).each(function(index) {
            var $item = $(this);
            $(this).find('*').each(function() {
                // update "id" attribute
                _updateAttrID($(this), index);

                // update "name" attribute
                _updateAttrName($(this), index);
            });
        });
    };

    var _fixFormValidatonInput = function(widgetOptions, attribute, id, name) {
        if (attribute !== undefined) {
            attribute           = $.extend(true, {}, attribute);
            attribute.id        = id;
            attribute.container = ".field-" + id;
            attribute.input     = "#" + id;
            attribute.name      = name;
            attribute.value     = $("#" + id).val();
            attribute.status    = 0;

            if ($("#" + widgetOptions.formId).yiiActiveForm("find", id) !== "undefined") {
                $("#" + widgetOptions.formId).yiiActiveForm("remove", id);
            }

            $("#" + widgetOptions.formId).yiiActiveForm("add", attribute);
        }
    };

    var _fixFormValidaton = function(widgetOptions) {
        var widgetOptionsRoot = _getWidgetOptionsRoot(widgetOptions);

        $(widgetOptionsRoot.widgetBody).find('input, textarea, select').each(function() {
            var id   = $(this).attr('id');
            var name = $(this).attr('name');

            if (id !== undefined && name !== undefined) {
                currentWidgetOptions = eval($(this).closest('div[data-dynamicform]').attr('data-dynamicform'));
                var matches = id.match(regexID);

                if (matches && matches.length === 4) {
                    matches[2]      = matches[2].substring(1, matches[2].length - 1);
                    var level       = _getLevel($(this));
                    var identifiers = _createIdentifiers(level -1);
                    var baseID      = matches[1] + '-' + identifiers.join('-') + '-' + matches[3];
                    var attribute   = $("#" + currentWidgetOptions.formId).yiiActiveForm("find", baseID);
                    _fixFormValidatonInput(currentWidgetOptions, attribute, id, name);
                }
            }
        });
    };

    $('div[data-dynamicform]').on('afterInsert', function (e, item) {
        let childDatePicker = $(item).find('[data-krajee-datetimepicker]');
        let childSelect2 = $(item).find('[data-krajee-select2]');

        if (childDatePicker.length > 0) {

            childDatePicker.each(function() {
                if ($(this).data('datetimepicker')) {
                    $(this).datetimepicker('destroy');
                }

                let dateTimePickerOptions = eval($(this).attr('data-krajee-datetimepicker'));
                $(this).datetimepicker(dateTimePickerOptions);
            });
        }

        if (childSelect2.length > 0) {
            childSelect2.each(function () {
                if ($(this).data('select2')) {
                    $(this).select2('destroy');
                }

                let s2Init = eval($(this).attr('data-krajee-select2'));
                let s2Options = eval($(this).attr('data-s2-options'));

                let s2id = $(this).attr('id');
                $.when($(this).select2(s2Init)).done(initS2Loading(s2id, s2Options));
                $(this).parent().find('.kv-plugin-loading').hide();
                $(this).val(null).trigger('change');
            });
        }
    });
})(window.jQuery);
