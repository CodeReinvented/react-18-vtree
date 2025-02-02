/* eslint-disable max-depth */
import React, { FC } from 'react';
import AutoSizer from 'react-virtualized-auto-sizer';
import {
  FixedSizeNodeData,
  FixedSizeNodePublicState,
  FixedSizeTree,
  TreeWalker,
  TreeWalkerValue,
} from '..';
import { NodeComponentProps } from '../Tree';

// eslint-disable-next-line storybook/story-exports
type TreeNode = Readonly<{
  children: TreeNode[];
  id: number;
  name: string;
}>;

type TreeData = FixedSizeNodeData &
  Readonly<{
    isLeaf: boolean;
    name: string;
    nestingLevel: number;
  }>;

let nodeId = 0;

const createNode = (depth: number = 0): TreeNode => {
  const node: TreeNode = {
    children: [],
    id: nodeId,
    name: `test-${nodeId}`,
  };

  nodeId += 1;

  if (depth === 5) {
    return node;
  }

  for (let i = 0; i < 10; i++) {
    node.children.push(createNode(depth + 1));
  }

  return node;
};

const rootNode = createNode();
const defaultTextStyle = { marginLeft: 10 };
const defaultButtonStyle = { fontFamily: 'Courier New' };

type NodeMeta = Readonly<{
  nestingLevel: number;
  node: TreeNode;
}>;

const getNodeData = (
  node: TreeNode,
  nestingLevel: number
): TreeWalkerValue<TreeData, NodeMeta> => ({
  data: {
    id: node.id.toString(),
    isLeaf: node.children.length === 0,
    isOpenByDefault: true,
    name: node.name,
    nestingLevel,
  },
  nestingLevel,
  node,
});

function* treeWalker(): ReturnType<TreeWalker<TreeData, NodeMeta>> {
  yield getNodeData(rootNode, 0);

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  while (true) {
    const parentMeta = yield;

    // eslint-disable-next-line @typescript-eslint/prefer-for-of
    for (let i = 0; i < parentMeta.node.children.length; i++) {
      yield getNodeData(
        parentMeta.node.children[i],
        parentMeta.nestingLevel + 1
      );
    }
  }
}

const Node: FC<
  NodeComponentProps<TreeData, FixedSizeNodePublicState<TreeData>>
> = ({ data: { isLeaf, name, nestingLevel }, isOpen, style, setOpen }) => (
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
          onClick={() => setOpen(!isOpen)}
          style={defaultButtonStyle}
        >
          {isOpen ? '-' : '+'}
        </button>
      </div>
    )}
    <div style={defaultTextStyle}>{name}</div>
  </div>
);

type TreePresenterProps = Readonly<{
  itemSize: number;
}>;

const TreePresenter: FC<TreePresenterProps> = ({ itemSize }) => (
  <AutoSizer disableWidth>
    {({ height }) => (
      <FixedSizeTree
        treeWalker={treeWalker}
        itemSize={itemSize}
        height={height}
        width="100%"
      >
        {Node}
      </FixedSizeTree>
    )}
  </AutoSizer>
);

export default {
  component: TreePresenter,
  title: 'Fixed Size Tree',
  args: { itemSize: 30 },
};
