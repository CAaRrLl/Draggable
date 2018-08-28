/*
$draggable(
    selector: string,   //可拖拽节点的选择器
    options: {
        mode?: 'all' | 'once',
        targets?: string[],     //如果mode为once则该项必填,为拖拽的目标节点选择器
        limit: {                //拖拽的边界
            top: number,
            left: number,
            width: number,
            height: number
        }
    }
) 
*/
(function(win) {

    function Draggable(selector, options) {
        this.id = Draggable.instances.length;
        this.mode = options.mode || 'all';
        if(this.mode === 'once') {
            this.targets = options.targets;
            if(!this.target) {
                throw new Error('when mode is "once", options.targets is required');
            }
        }
        this.source = document.querySelector(selector);
        this.limit = options.limit;
        this.width = options.width;
        this.height = options.height;

        this.isMouseDown = false;
        this.isLimit = false;
        
        this.eventFuncMap = {};
    }

    Draggable.instances = [];

    Draggable.initCSS = function() {
        var style = document.createElement('style');
        style.setAttribute('type', 'text/css');
        style.innerHTML = `
            .draggable-source {
                -webkit-user-select:none;
                -moz-user-select:none;
                -ms-user-select:none;
                user-select:none;
                cursor: pointer;
                background-color: initial;
                ${createTransition('background-color 0.3s')}
            }
            .draggable-source:hover {
                background-color: #d6e1e636;
                border-radius: 2px;
            }
            .draggable-dragging {
                background-color: #d6e1e636;
                box-shadow: 0px 1px 1px 0px #e4e4e4;
            }
        `;
        document.head.appendChild(style);
    }

    Draggable.prototype.bindStart = function() {
        var context = this;
        var source = context.source;
        function mousedown(e) {
            if(source.className.indexOf('draggable-dragging') === -1) {
                source.className += ' draggable-dragging';
                context.isMouseDown = true;
                context.posX = e.clientX;
                context.posY = e.clientY;
                if(context.isInLimit() && context.isLimit) {
                    context.showLimitArea();
                }
            }
        }
        source.addEventListener('mousedown', mousedown);
        this.eventFuncMap.mousedown = mousedown;
    }

    Draggable.prototype.bindMove = function() {
        var context = this;
        var source = context.source;
        function mousemove(e) {
            if(!context.isMouseDown) return;
            var incrementX = e.clientX - context.posX,
                incrementY = e.clientY - context.posY;
            var oldTop, oldLeft;
            oldTop = +source.style.top.replace('px', '');
            oldLeft = +source.style.left.replace('px', '');
            
            source.style.top = oldTop + incrementY + 'px';
            source.style.left = oldLeft + incrementX + 'px';

            if(context.isLimit) {
                var top = source.offsetTop,
                    left = source.offsetLeft,
                    width = source.offsetWidth,
                    height = source.offsetHeight;

                if(top < context.limit.top || top + height > context.limit.top + context.limit.height) {
                    source.style.top = oldTop + 'px';
                }

                if(left < context.limit.left || left + width > context.limit.left + context.limit.width) {
                    source.style.left = oldLeft + 'px';
                }
            }

            context.posX = e.clientX;
            context.posY = e.clientY;
        }
        window.addEventListener('mousemove', mousemove);
        this.eventFuncMap.mousemove = mousemove;
    }

    Draggable.prototype.bindEnd = function() {
        var context = this;
        var source = context.source;
        function mouserelease() {
            var newclassName = source.className.replace(' draggable-dragging', '');
            source.className = newclassName;
            context.isMouseDown = false;
            if(context.isInLimit()) {
                context.unshowLimitArea();
            }
        }
        window.addEventListener('mouseup', mouserelease);
        this.eventFuncMap.mouserelease = mouserelease;
    }

    Draggable.prototype.setLimitArea = function() {
        this.isLimit = true;
        if(this.isInLimit()) {
            var limitTop = this.limit.top,
                limitLeft = this.limit.left,
                limitWidth = this.limit.width,
                limitHeight = this.limit.height;
            var area = document.createElement('div');
            area.style.cssText = `
                position: absolute;
                display: none;
                opacity: 0;
                top: ${limitTop}px;
                left: ${limitLeft}px;
                width: ${limitWidth}px;
                height: ${limitHeight}px;
                border: 1px dashed #999;
                ${createTransition('opacity 0.5s')}
            `;
            this.source.parentNode.appendChild(area);
            this.limitAreaElement = area;
            area.addEventListener('transitionend', function () {
                if(area.style.opacity == 0) {
                    area.style.display = 'none';
                }
            });
        }
    }

    Draggable.prototype.isInLimit = function() {
        var top = this.source.offsetTop,
            left = this.source.offsetLeft,
            width = this.source.offsetWidth,
            height = this.source.offsetHeight,
            limitTop = this.limit && this.limit.top,
            limitLeft = this.limit && this.limit.left,
            limitWidth = this.limit && this.limit.width,
            limitHeight = this.limit && this.limit.height;

        return top >= limitTop && left >= limitLeft && 
        left + width <= limitLeft + limitWidth && top + height <= limitTop + limitHeight;
    }

    Draggable.prototype.showLimitArea = function() {
        if(!this.limitAreaElement) return;
        var element = this.limitAreaElement;
        element.style.display = 'block';
        requestAnimationFrame(function() {
            element.style.opacity = 1;
        });
    }

    Draggable.prototype.unshowLimitArea = function() {
        if(!this.limitAreaElement) return;
        var element = this.limitAreaElement;
        element.style.opacity = 0;
    }

    Draggable.prototype.releaseLimitArea = function() {
        if(!this.limitAreaElement) return;
        this.limitAreaElement.parentNode.removeChild(this.limitAreaElement);
        this.limitAreaElement = null;
    }

    Draggable.prototype.cancelBind = function() {
        var source = this.source;
        var eventMap = this.eventFuncMap;
        source.removeEventListener('mousedown', eventMap.mousedown);
        window.removeEventListener('mousemove', eventMap.mousemove);
        window.removeEventListener('mouseup', eventMap.mouserelease);
        for(const key in eventMap) {
            delete eventMap[key];
        }
    }

    Draggable.prototype.transformSource = function() {
        this.source.className = 'draggable-source';

        var width = this.source.offsetWidth;
        var height = this.source.offsetHeight;
        var top = this.source.offsetTop;
        var left = this.source.offsetLeft;

        var parentNode = this.source.parentNode;
        if(parentNode) {
            if(parentNode.style.position === 'relative' || parentNode.style.position === 'absolute') {
                top -= this.parentNode.offsetTop;
                left -= this.parentNode.offsetLeft;
            }
        }

        var context = this;
        var source = context.source;
        setTimeout(function() {
            source.style.cssText = `
                position: absolute;
                width: ${width}px;
                height: ${height}px;
                top: ${top}px;
                left: ${left}px;
            `;
        }, 0);
    }

    Draggable.prototype.restoreSource = function() {
        var className = this.source.className.replace('draggable-source', '');
        this.source.className =className;
    }

    function createTransition(text) {
        return `
            transition: ${text};
            -moz-transition: ${text};
            -webkit-transition: ${text};
            -o-transition: ${text};
        `;
    }

    function draggable(selector, options) {
        var sourceItem =  new Draggable(selector, options);
        Draggable.instances.push(sourceItem);
        sourceItem.transformSource();
        if( sourceItem.limit 
            && typeof sourceItem.limit.top === 'number'
            && typeof sourceItem.limit.left === 'number'
            && typeof sourceItem.limit.width === 'number'
            && typeof sourceItem.limit.height === 'number') {
            sourceItem.setLimitArea();
        }
        sourceItem.bindStart();
        sourceItem.bindMove();
        sourceItem.bindEnd();
        return sourceItem.id;
    }

    draggable.cancel = function(id) {
        if(Draggable.instances[id]) {
            Draggable.instances[id].cancelBind();
            Draggable.instances[id].restoreSource();
            Draggable.instances[id].releaseLimitArea();
            Draggable.instances[id] = null;
        }
    }

    Draggable.initCSS();

    win.$draggable = draggable;
})(window);