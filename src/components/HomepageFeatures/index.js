import clsx from 'clsx';
import Heading from '@theme/Heading';
import styles from './styles.module.css';

const FeatureList = [
  {
    title: '⚡ JavaScript 峡谷底层',
    Svg: require('@site/static/img/undraw_docusaurus_mountain.svg').default,
    description: (
      <>
        单核英雄事件循环（Event Loop）、微任务优先级、作用域战争迷雾、闭包背包、原型链穿透与 V8 引擎 JIT 编译。
      </>
    ),
  },
  {
    title: '🤖 大模型与智能体天梯',
    Svg: require('@site/static/img/undraw_docusaurus_tree.svg').default,
    description: (
      <>
        从头训练 Tokenizer、Prompt 工程、LangChain 链式编排、RAG 向量检索增强与端到端质检评估。
      </>
    ),
  },
  {
    title: '🏛️ jQuery 宗师架构',
    Svg: require('@site/static/img/undraw_docusaurus_react.svg').default,
    description: (
      <>
        无 new 工厂原型环、时间刺客 pushStack 栈回溯、Callbacks 状态锁、Deferred 异步状态机与 Sizzle 逆向编译。
      </>
    ),
  },
];

function Feature({Svg, title, description}) {
  return (
    <div className={clsx('col col--4')}>
      <div className="text--center">
        <Svg className={styles.featureSvg} role="img" />
      </div>
      <div className="text--center padding-horiz--md">
        <Heading as="h3">{title}</Heading>
        <p>{description}</p>
      </div>
    </div>
  );
}

export default function HomepageFeatures() {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
