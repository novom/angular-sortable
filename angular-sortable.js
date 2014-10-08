'use strict';

(function($) {
    var events = {
        drag: 'mousemove touchmove',
        dragstart: 'mousedown touchstart',
        dragend: 'mouseup touchend',
        selectstart: 'selectstart'
    };

    function Sortable(element, options) {
        this.options = $.extend({
            items: '.sortable-element',
            dragX: true,
            dragY: true,
            handles: null,
            onChange: null,
            onDragstart: null,
            onDrag: null,
            onDragend: null
        }, options);

        this.state = null;
        this.$element = $(element);
        this.$activeElement = null;

        this.refresh();
    }

    Sortable.prototype.refresh = function() {
        var self = this,
                $elements = $(this.options.items, this.$element);

        $(document.body).off(events.dragend)
                .off(events.drag);

        $elements.off(events.dragstart);

        if (!this.$activeElement) {
            $elements.each(function(index, element) {
              $(element).on(events.dragstart, function(e) {
                self.dragstart(e, element);
              });

            });
        }
    };

    Sortable.prototype.drag = function(event) {
        this.options.onDrag(event);
        if (event.isPropagationStopped())
            return;

        var self = this,
                $items = $(this.options.items, this.$element),
                selfIdx = $items.index(this.$activeElement),
                dragElement = this.$dragElement[0],
                item,
                found,
                otherIdx;

        this.$dragElement.css('top', '+=' + (event.clientY - this.state.clientY));
        this.$dragElement.css('left', '+=' + (event.clientX - this.state.clientX));

        for (var i = 0; i < $items.length - 1 && !found; i++) {
            item = $items[i];
            if (item === this.$activeElement) {
                continue;
            }

            var offsetY = event.offsetY + dragElement.offsetTop;
            var offsetX = event.offsetX + dragElement.offsetLeft;

            // Extremely simplified computation, we switch element as soon as
            // the mouse pointer hovers another sortable element...
            if (offsetY > item.offsetTop
                    && offsetY < item.offsetTop + item.offsetHeight
                    && offsetX > item.offsetLeft
                    && offsetX < item.offsetLeft + item.offsetWidth) {

                otherIdx = $items.index(item);
                self.options.onChange(selfIdx, otherIdx);
                found = true;
            }
        }

        this.state = event;
    };
    Sortable.prototype.dragstart = function(event, targetEl) {
        if (event.which !== 1) {
            // Make sure it is a left mouse click
            return;
        }
        var self = this,
                position;

        // make sure event.target is a handle
        if (this.options.handles) {
            if (!$(event.target).closest(this.options.handles).length) {
                return;
            }
        }
        this.options.onDragstart(event);
        if (event.isPropagationStopped())
            return;

        $(document.body).attr('unselectable', 'on');

        this.$activeElement = $(targetEl);
        this.$activeElement.addClass('sortable-element-active');
        position = this.$activeElement.position();

        // Todo: The following will eventually cause problems related to styling,
        // this should be a clone of the activeElement without all the angular bindings...
        this.$dragElement = $('<' + targetEl.tagName + '/>').html(targetEl.innerHTML)
                .css({
                    width: this.$activeElement.width(),
                    height: this.$activeElement.height(),
                    top: position.top,
                    left: position.left
                })
                .addClass('sortable-element sortable-element-dragitem')
                .appendTo(targetEl.parentNode);

        this.$element.addClass('sortable-active');

        $(this.options.items, this.$element).off(events.dragstart);

        $(document.body).on(events.drag, function(e) {
                    self.drag(e);
                })
                .on(events.dragend, function(e) {
                    self.dragend(e);
                })
                .on(events.selectstart, function(e) {
                    e.preventDefault();
                    return false;
                });

        this.state = event;
    };

    Sortable.prototype.dragend = function(event) {
        var self = this;
        var activeElement = this.$activeElement;

        this.options.onDragend(event);
        if (event.isPropagationStopped())
            return;

        $(document.body).attr('unselectable', 'off')
                .off(events.drag)
                .off(events.dragend)
                .off(events.selectstart);

        this.$activeElement.removeClass('sortable-element-active');

        this.$element.removeClass('sortable-active');

        this.$dragElement.remove();

        this.$activeElement = null;
        
        this.refresh();
    };

    var safeApply = function($scope, fn) {
        var phase = $scope.$root.$$phase;
        if (phase === '$apply' || phase === '$digest') {
            if (fn && (typeof (fn) === 'function')) {
                fn();
            }
        } else {
            $scope.$root.$apply(fn);
        }
    };

    angular.module('sortable', [])
            .directive('ngSortable',
                    function() {
                        return {
                            restrict: 'A',
                            scope: {
                                ngSortable: '=',
                                ngSortableHandles: '@',
                                ngSortableOnChange: '=',
                                ngSortableOnDrag: '=',
                                ngSortableOnDragstart: '=',
                                ngSortableOnDragend: '='
                            },
                            link: function($scope, $element, $attrs) {

                                function onChange(fromIdx, toIdx) {
                                    if (fromIdx === toIdx)
                                        return;

                                    safeApply($scope, function() {
                                        var temp = $scope.ngSortable.splice(fromIdx, 1);
                                        $scope.ngSortable.splice(toIdx, 0, temp[0]);
                                    });
                                }

                                var options = {
                                    onChange: onChange,
                                    handles: $scope.ngSortableHandles,
                                    onDrag: $scope.ngSortableOnDrag || $.noop,
                                    onDragstart: $scope.ngSortableOnDragstart || $.noop,
                                    onDragend: $scope.ngSortableOnDragend || $.noop
                                };

                                if($scope.ngSortableOnChange) {
                                    options.onChange = function(fromIdx, toIdx) {
                                        onChange(fromIdx, toIdx);
                                        $scope.ngSortableOnChange(fromIdx, toIdx);
                                    };
                                }

                                var sortable = new Sortable($element, options);

                                $scope.$watch('ngSortable.length', function() {
                                    sortable.refresh();
                                });
                            }
                        };
                    });
}($));

