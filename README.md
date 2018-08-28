# Draggable
原生JS实现拖拽组件

```javascript
$draggable(
    selector: string,   //可拖拽节点的选择器
    options: {
        mode: 'all' | 'once',
        targets?: string[],     //如果mode为once则该项必填,为拖拽的目标节点选择器
        limit: {                //拖拽的边界
            top: number,
            left: number,
            size: number
        }
    }
) 
```