/* eslint-disable max-depth */
import { storiesOf } from '@storybook/react';
import React, { FC, useCallback, useMemo, useRef, useState } from 'react';
import AutoSizer from 'react-virtualized-auto-sizer';
import {
  FixedSizeNodeData,
  FixedSizeNodePublicState,
  FixedSizeTree,
  TreeWalker,
  TreeWalkerValue,
} from '..';
import { NodeComponentProps } from '../Tree';
import { AsyncTaskScheduler } from './utils';

document.body.style.margin = '0';
document.body.style.display = 'flex';
document.body.style.minHeight = '100vh';

type TreeNode = Readonly<{
  children: TreeNode[];
  downloaded: boolean;
  id: number;
  name: string;
}>;

type TreeData = FixedSizeNodeData &
  Readonly<{
    download: () => Promise<void>;
    downloaded: boolean;
    isLeaf: boolean;
    name: string;
    nestingLevel: number;
  }>;

let nodeId = 0;

const createNode = (
  downloadedIds: readonly number[],
  depth: number = 0
): TreeNode => {
  const id = nodeId;
  const node: TreeNode = {
    children: [],
    downloaded: downloadedIds.includes(id),
    id,
    name: `test-${nodeId}`,
  };

  nodeId += 1;

  if (depth === 5) {
    return node;
  }

  for (let i = 0; i < 10; i++) {
    node.children.push(createNode(downloadedIds, depth + 1));
  }

  return node;
};

const defaultTextStyle = { marginLeft: 10 };
const defaultButtonStyle = { fontFamily: 'Courier New' };

type NodeMeta = Readonly<{
  nestingLevel: number;
  node: TreeNode;
}>;

const getNodeData = (
  node: TreeNode,
  nestingLevel: number,
  download: () => Promise<void>
): TreeWalkerValue<TreeData, NodeMeta> => ({
  data: {
    download,
    downloaded: node.downloaded,
    id: node.id.toString(),
    isLeaf: node.children.length === 0,
    isOpenByDefault: false,
    name: node.name,
    nestingLevel,
  },
  nestingLevel,
  node,
});

const Node: FC<
  NodeComponentProps<TreeData, FixedSizeNodePublicState<TreeData>>
> = ({
  data: { download, downloaded, isLeaf, name, nestingLevel },
  isOpen,
  style,
  setOpen,
}) => {
  const [isLoading, setLoading] = useState(false);

  return (
    <div
      style={{
        ...style,
        alignItems: 'center',
        display: 'flex',
        marginLeft: nestingLevel * 30 + (isLeaf ? 48 : 0),
      }}
    >
      {!isLeaf && (
        <div>
          <button
            type="button"
            onClick={async () => {
              if (!downloaded) {
                setLoading(true);
                await download();
                await setOpen(!isOpen);
                setLoading(false);
              } else {
                await setOpen(!isOpen);
              }
            }}
            style={defaultButtonStyle}
          >
            {isLoading ? '⌛' : isOpen ? '-' : '+'}
          </button>
        </div>
      )}
      <div style={defaultTextStyle}>{name}</div>
    </div>
  );
};

type TreePresenterProps = Readonly<{
  disableAsync: boolean;
  itemSize: number;
}>;

const TreePresenter: FC<TreePresenterProps> = ({ disableAsync, itemSize }) => {
  const [downloadedIds, setDownloadedIds] = useState<readonly number[]>([]);
  const scheduler = useRef<AsyncTaskScheduler<number>>(
    new AsyncTaskScheduler((ids) => {
      setDownloadedIds(ids);
    })
  );
  const rootNode = useMemo(() => {
    nodeId = 0;

    return createNode(downloadedIds);
  }, [downloadedIds]);

  const createDownloader = (node: TreeNode) => (): Promise<void> =>
    new Promise((resolve) => {
      const timeoutId = setTimeout(() => {
        scheduler.current.finalize();
      }, 2000);

      scheduler.current.add(node.id, resolve, () => clearTimeout(timeoutId));
    });

  const treeWalker = useCallback(
    function* treeWalker(): ReturnType<TreeWalker<TreeData, NodeMeta>> {
      yield getNodeData(rootNode, 0, createDownloader(rootNode));

      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      while (true) {
        const parentMeta = yield;

        if (parentMeta.data.downloaded) {
          // eslint-disable-next-line @typescript-eslint/prefer-for-of
          for (let i = 0; i < parentMeta.node.children.length; i++) {
            yield getNodeData(
              parentMeta.node.children[i],
              parentMeta.nestingLevel + 1,
              createDownloader(parentMeta.node.children[i])
            );
          }
        }
      }
    },
    [rootNode]
  );

  return (
    <AutoSizer disableWidth>
      {({ height }) => (
        <FixedSizeTree
          treeWalker={treeWalker}
          itemSize={itemSize}
          height={height}
          async={!disableAsync}
          width="100%"
        >
          {Node}
        </FixedSizeTree>
      )}
    </AutoSizer>
  );
};

storiesOf('Tree', module).add('Async data', () => (
  <TreePresenter disableAsync={false} itemSize={30} />
));
