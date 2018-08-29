/*
$draggable(
    selector: string,   //可拖拽节点的选择器
    options: {
        mode?: 'all' | 'once',
        targets?: {             //如果mode为once则该项必填,为拖拽的目标节点选择器
            [selector: string]: {top: number, left: number}
        },           
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
            if(!this.targets) {
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

    Draggable.Cancel = function(id) {
        if(Draggable.instances[id]) {
            Draggable.instances[id].cancelBind();
            Draggable.instances[id].restoreSource();
            Draggable.instances[id].releaseLimitArea();
            Draggable.instances[id] = null;
        }
    }

    Draggable.zIndex = 5;

    Draggable.borderZIndex = 6;

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
            .draggable-source-move {
                ${createTransition('background-color 0.3s, top 0.4s ease-in, left 0.4s ease-in')}
            }
            .draggable-source:active {
                background-color: #d6e1e636;
                border-radius: 2px;
            }
            .draggable-dragging {
                background-color: #e3e7e836;
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
            }
            document.body.style.cursor = 'pointer';
            context.isMouseDown = true;
            context.posX = e.clientX;
            context.posY = e.clientY;
            if(context.isInLimit(source) && context.isLimit) {
                context.showLimitArea();
            }

            if(context.mode === 'once') {
                var newclassName = source.className.replace(' draggable-source-move', '');
                source.className = newclassName;
                context.startTop = +source.style.top.replace('px', '');
                context.startLeft = +source.style.left.replace('px', '');
                context.showTargetAreas()
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

            if(context.mode === 'once') {
                if(context.targetNode = context.isTouchTarget()) {
                    context.isTouch = true;
                    context.selectTarget(context.targetNode.selector);
                } else {
                    context.isTouch = false;
                    for(const key in context.targets) {
                        var target = context.targets[key];
                        target.tipNodeX.style.height = 2 + 'px';
                        target.tipNodeY.style.width = 2 + 'px';
                    }
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
            document.body.style.cursor = 'default';
            context.isMouseDown = false;
            if(context.isInLimit(source)) {
                context.unshowLimitArea();
            }

            if(context.mode === 'once') {
                if(context.isTouch && context.targetNode) {
                    var targetNode = context.targetNode
                    context.reachTarget(targetNode.target, targetNode.top, targetNode.left);
                    context.releaseTargetAreas();
                    Draggable.Cancel(context.id);
                } else {
                    context.dragBack();
                }
                context.unshowTargetAreas();
            }
        }
        window.addEventListener('mouseup', mouserelease);
        this.eventFuncMap.mouserelease = mouserelease;
    }

    Draggable.prototype.dragBack = function() {
        if(typeof this.startTop === 'number' && typeof this.startLeft === 'number') {
            if(this.source.className.indexOf('draggable-source-move') === -1) {
                this.source.className += ' draggable-source-move';
            }
            this.source.style.top = this.startTop + 'px';
            this.source.style.left = this.startLeft + 'px';
        }
    }

    Draggable.prototype.setTargetAreas = function() {
        var context = this;
        setTimeout(function() {
            for(const target in context.targets) {
                var targetNode = document.querySelector(target);
                if(!targetNode) continue;
                if(context.isInLimit(targetNode)) {
                    var fragment = document.createDocumentFragment();
                    context.targets[target].tipNodeX = document.createElement('div');
                    context.targets[target].tipNodeY = document.createElement('div');
                
                    context.targets[target].tipNodeX.style.cssText = `
                        position: absolute;
                        width: 22px;
                        background-color: #999;
                        border-radius: 2px;
                        height: 2px;
                        top: 50%;
                        left: 50%;
                        transform: translate(-50%, -50%);
                        opacity: 0;
                        ${createTransition('opacity 0.3s, width 0.4s, height 0.4s')}
                    `;
                    context.targets[target].tipNodeY.style.cssText = `
                        position: absolute;
                        height: 22px;
                        background-color: #999;
                        border-radius: 2px;
                        width: 2px;
                        top: 50%;
                        left: 50%;
                        transform: translate(-50%, -50%);
                        opacity: 0;
                        ${createTransition('opacity 0.3s, width 0.4s, height 0.4s')}
                    `;
                    
                    fragment.appendChild(context.targets[target].tipNodeX);
                    fragment.appendChild(context.targets[target].tipNodeY);
                    if(targetNode.style.position !== 'relative' || targetNode.style.position !== 'absolute') {
                        targetNode.style.position = 'relative';
                    } 
                    targetNode.appendChild(fragment);
                } else {
                    context.targets[target] = null;
                    delete context.targets[target];
                }
            } 
        }, 0);
    }

    Draggable.prototype.showTargetAreas = function() {
        for(const key in this.targets) {
            var target = this.targets[key];
            target.tipNodeX.style.opacity = 1;
            target.tipNodeY.style.opacity = 1;
            target.tipNodeX.style.height = 2 + 'px';
            target.tipNodeY.style.width = 2 + 'px';
            if(!target.tipParentBackgrountColor) {
                target.tipParentBackgrountColor = target.tipNodeX.parentNode.style.backgroundColor;
            }
            target.tipNodeX.parentNode.style.backgroundColor = '#4e4e4e0d';
        }
    }

    Draggable.prototype.selectTarget = function(targetSelector) {
        for(const key in this.targets) {
            var target = this.targets[key];
            var weight = 2;
            if(key === targetSelector) {
                weight = 4;
            }
            target.tipNodeX.style.height = weight + 'px';
            target.tipNodeY.style.width = weight + 'px';
        }
    }

    Draggable.prototype.unshowTargetAreas = function() {
        for(const key in this.targets) {
            var target = this.targets[key];
            target.tipNodeX.style.opacity = 0;
            target.tipNodeY.style.opacity = 0;
            target.tipNodeX.parentNode.style.backgroundColor = target.tipParentBackgrountColor;
        }
    }

    Draggable.prototype.isTouchTarget = function() {
        for(const key in this.targets) {
            var target = document.querySelector(key);
            var tTop = target.offsetTop,
                tLeft = target.offsetLeft, 
                tWidth = target.offsetWidth, 
                tHeight = target.offsetHeight,
                top = this.source.offsetTop, 
                left = this.source.offsetLeft, 
                width = this.source.offsetWidth, 
                height = this.source.offsetHeight;
            
            var sourceCenterX = top + width / 2,
                sourceCenterY = left + height / 2,
                targetCenterX = tTop + tWidth / 2,
                targetCenterY = tLeft + tHeight / 2;

            var xDistance = Math.abs(sourceCenterX - targetCenterX),
                yDistance = Math.abs(sourceCenterY - targetCenterY);

            if(xDistance < width / 2 + tWidth / 2 && yDistance < height / 2 + tHeight / 2) {
                return {selector: key, target, top: this.targets[key].top, left: this.targets[key].left};
            }
        }
        return null;
    }

    Draggable.prototype.reachTarget = function(target, top, left) {
        var source = this.source;
        var oldtop = source.offsetTop,
            oldleft = source.offsetLeft;
        
        var targetTop = target.offsetTop,
            targetLeft = target.offsetLeft;

        var newtop = oldtop - targetTop,
            newleft = oldleft - targetLeft;

        target.appendChild(source);
        source.style.top = newtop + 'px';
        source.style.left = newleft + 'px';

        if(source.className.indexOf('draggable-source-move') === -1) {
            source.className += ' draggable-source-move';
        }
        setTimeout(function() {
            source.style.top = (top? top : 0) + 'px';
            source.style.left = (left? left : 0) + 'px';
        }, 0);
    }

    Draggable.prototype.releaseTargetAreas = function() {
        for(const key in this.targets) {
            var target = this.targets[key];
            target.tipNodeX.parentNode.removeChild(target.tipNodeX);
            target.tipNodeY.parentNode.removeChild(target.tipNodeY);
            target.tipNodeX = null;
            target.tipNodeY = null;
            delete this.targets[key];
        }
    }

    Draggable.prototype.setLimitArea = function() {
        this.isLimit = true;
        if(this.isInLimit(this.source)) {
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
                z-index: ${Draggable.borderZIndex};
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

    Draggable.prototype.isInLimit = function(source) {
        if(!source) return false;
        var top = source.offsetTop,
            left = source.offsetLeft,
            width = source.offsetWidth,
            height = source.offsetHeight,
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
        this.source.className += ' draggable-source';

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
                z-index: ${Draggable.zIndex};
            `;
        }, 0);
    }

    Draggable.prototype.restoreSource = function() {
        var source = this.source;
        var className = source.className.replace('draggable-source', '');
        setTimeout(function() {
            className = className.replace('draggable-source-move', '');
            source.className = className;
        }, 1000);
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
        if(sourceItem.limit 
            && typeof sourceItem.limit.top === 'number'
            && typeof sourceItem.limit.left === 'number'
            && typeof sourceItem.limit.width === 'number'
            && typeof sourceItem.limit.height === 'number') {
            sourceItem.setLimitArea();
        }
        if(sourceItem.mode === 'once' && sourceItem.targets) {
            sourceItem.setTargetAreas();
        }
        sourceItem.bindStart();
        sourceItem.bindMove();
        sourceItem.bindEnd();
        return sourceItem.id;
    }

    draggable.cancel = Draggable.Cancel;

    Draggable.initCSS();

    win.$draggable = draggable;
})(window);