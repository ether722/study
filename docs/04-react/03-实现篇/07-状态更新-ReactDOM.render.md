# ReactDOM.render

> 抓取来源: [https://react.iamkasong.com/state/reactdom.html](https://react.iamkasong.com/state/reactdom.html)

---

经过五章的学习，我们终于回到了`React`应用的起点。

这一节我们完整的走通`ReactDOM.render`完成页面渲染的整个流程。

## [#](#创建fiber) 创建fiber

从[双缓存机制一节](/process/doubleBuffer.html#mount时)我们知道，首次执行`ReactDOM.render`会创建`fiberRootNode`和`rootFiber`。其中`fiberRootNode`是整个应用的根节点，`rootFiber`是要渲染组件所在组件树的`根节点`。

这一步发生在调用`ReactDOM.render`后进入的`legacyRenderSubtreeIntoContainer`方法中。

```
// container指ReactDOM.render的第二个参数（即应用挂载的DOM节点）
root = container._reactRootContainer = legacyCreateRootFromDOMContainer(
  container,
  forceHydrate,
);
fiberRoot = root._internalRoot;
```

> 你可以从[这里](https://github.com/facebook/react/blob/1fb18e22ae66fdb1dc127347e169e73948778e5a/packages/react-dom/src/client/ReactDOMLegacy.js#L193) 看到这一步的代码

`legacyCreateRootFromDOMContainer`方法内部会调用`createFiberRoot`方法完成`fiberRootNode`和`rootFiber`的创建以及关联。并初始化`updateQueue`。

```
export function createFiberRoot(
  containerInfo: any,
  tag: RootTag,
  hydrate: boolean,
  hydrationCallbacks: null | SuspenseHydrationCallbacks,
): FiberRoot {
  // 创建fiberRootNode
  const root: FiberRoot = (new FiberRootNode(containerInfo, tag, hydrate): any);
  
  // 创建rootFiber
  const uninitializedFiber = createHostRootFiber(tag);

  // 连接rootFiber与fiberRootNode
  root.current = uninitializedFiber;
  uninitializedFiber.stateNode = root;

  // 初始化updateQueue
  initializeUpdateQueue(uninitializedFiber);

  return root;
}
```

根据以上代码，现在我们可以在[双缓存机制一节](/process/doubleBuffer.html#mount时)基础上补充上`rootFiber`到`fiberRootNode`的引用。

![fiberRoot](pathname:///img/fiberroot.png)

> 你可以从[这里](https://github.com/facebook/react/blob/1fb18e22ae66fdb1dc127347e169e73948778e5a/packages/react-reconciler/src/ReactFiberRoot.new.js#L97) 看到这一步的代码

## [#](#创建update) 创建update

我们已经做好了组件的初始化工作，接下来就等待创建`Update`来开启一次更新。

这一步发生在`updateContainer`方法中。

```
export function updateContainer(
  element: ReactNodeList,
  container: OpaqueRoot,
  parentComponent: ?React$Component<any, any>,
  callback: ?Function,
): Lane {
  // ...省略与逻辑不相关代码

  // 创建update
  const update = createUpdate(eventTime, lane, suspenseConfig);
  
  // update.payload为需要挂载在根节点的组件
  update.payload = {element};

  // callback为ReactDOM.render的第三个参数 —— 回调函数
  callback = callback === undefined ? null : callback;
  if (callback !== null) {
    update.callback = callback;
  }

  // 将生成的update加入updateQueue
  enqueueUpdate(current, update);
  // 调度更新
  scheduleUpdateOnFiber(current, lane, eventTime);

  // ...省略与逻辑不相关代码
}
```

> 你可以从[这里](https://github.com/facebook/react/blob/1fb18e22ae66fdb1dc127347e169e73948778e5a/packages/react-reconciler/src/ReactFiberReconciler.new.js#L255) 看到`updateContainer`的代码

值得注意的是其中`update.payload = {element};`

这就是我们在[Update一节](/state/update.html#update的结构)介绍的，对于`HostRoot`，`payload`为`ReactDOM.render`的第一个传参。

## [#](#流程概览) 流程概览

至此，`ReactDOM.render`的流程就和我们已知的流程连接上了。

整个流程如下：

```
创建fiberRootNode、rootFiber、updateQueue（`legacyCreateRootFromDOMContainer`）

    |
    |
    v

创建Update对象（`updateContainer`）

    |
    |
    v

从fiber到root（`markUpdateLaneFromFiberToRoot`）

    |
    |
    v

调度更新（`ensureRootIsScheduled`）

    |
    |
    v

render阶段（`performSyncWorkOnRoot` 或 `performConcurrentWorkOnRoot`）

    |
    |
    v

commit阶段（`commitRoot`）
```

## [#](#react的其他入口函数) React的其他入口函数

当前`React`共有三种模式：

*   `legacy`，这是当前`React`使用的方式。当前没有计划删除本模式，但是这个模式可能不支持一些新功能。
    
*   `blocking`，开启部分`concurrent`模式特性的中间模式。目前正在实验中。作为迁移到`concurrent`模式的第一个步骤。
    
*   `concurrent`，面向未来的开发模式。我们之前讲的`任务中断/任务优先级`都是针对`concurrent`模式。
    

你可以从下表看出各种模式对特性的支持：

legacy 模式

blocking 模式

concurrent 模式

[String Refs](https://zh-hans.reactjs.org/docs/refs-and-the-dom.html#legacy-api-string-refs)

✅

🚫\*\*

🚫\*\*

[Legacy Context](https://zh-hans.reactjs.org/docs/legacy-context.html)

✅

🚫\*\*

🚫\*\*

[findDOMNode](https://zh-hans.reactjs.org/docs/strict-mode.html#warning-about-deprecated-finddomnode-usage)

✅

🚫\*\*

🚫\*\*

[Suspense](https://zh-hans.reactjs.org/docs/concurrent-mode-suspense.html#what-is-suspense-exactly)

✅

✅

✅

[SuspenseList](https://zh-hans.reactjs.org/docs/concurrent-mode-patterns.html#suspenselist)

🚫

✅

✅

Suspense SSR + Hydration

🚫

✅

✅

Progressive Hydration

🚫

✅

✅

Selective Hydration

🚫

🚫

✅

Cooperative Multitasking

🚫

🚫

✅

Automatic batching of multiple setStates

🚫\*

✅

✅

[Priority-based Rendering](https://zh-hans.reactjs.org/docs/concurrent-mode-patterns.html#splitting-high-and-low-priority-state)

🚫

🚫

✅

[Interruptible Prerendering](https://zh-hans.reactjs.org/docs/concurrent-mode-intro.html#interruptible-rendering)

🚫

🚫

✅

[useTransition](https://zh-hans.reactjs.org/docs/concurrent-mode-patterns.html#transitions)

🚫

🚫

✅

[useDeferredValue](https://zh-hans.reactjs.org/docs/concurrent-mode-patterns.html#deferring-a-value)

🚫

🚫

✅

[Suspense Reveal "Train"](https://zh-hans.reactjs.org/docs/concurrent-mode-patterns.html#suspense-reveal-train)

🚫

🚫

✅

\*：`legacy`模式在合成事件中有自动批处理的功能，但仅限于一个浏览器任务。非`React`事件想使用这个功能必须使用 `unstable_batchedUpdates`。在`blocking`模式和`concurrent`模式下，所有的`setState`在默认情况下都是批处理的。

\*\*：会在开发中发出警告。

模式的变化影响整个应用的工作方式，所以无法只针对某个组件开启不同模式。

基于此原因，可以通过不同的`入口函数`开启不同模式：

*   `legacy` -- `ReactDOM.render(<App />, rootNode)`
*   `blocking` -- `ReactDOM.createBlockingRoot(rootNode).render(<App />)`
*   `concurrent` -- `ReactDOM.createRoot(rootNode).render(<App />)`

> 你可以在[这里](https://zh-hans.reactjs.org/docs/concurrent-mode-adoption.html#why-so-many-modes) 看到`React`团队解释为什么会有这么多模式

虽然不同模式的`入口函数`不同，但是他们仅对`fiber.mode`变量产生影响，对我们在[流程概览](/state/reactdom.html#流程概览)中描述的流程并无影响。

← [深入理解优先级](/state/priority.html) [this.setState](/state/setstate.html) →

Copyright© 2020-2025 卡颂

[京ICP备20028082号-1](https://beian.miit.gov.cn/)