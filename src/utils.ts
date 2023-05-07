import { FixedSizeList } from 'react-window';
import React from 'react';
import type {
  NodeData,
  NodePublicState,
  NodeRecord,
  TreeCreatorOptions,
  TreeProps,
  TreeState,
  TypedListChildComponentData,
} from './Tree';

export type Mutable<T> = {
  -readonly [P in keyof T]: T[P];
};

export type RequestIdleCallbackHandle = any;

export type RequestIdleCallbackOptions = Readonly<{
  timeout: number;
}>;

export type RequestIdleCallbackDeadline = Readonly<{
  didTimeout: boolean;
  timeRemaining: () => number;
}>;

export type DefaultTreeProps = TreeProps<
  NodeData,
  NodePublicState<NodeData>,
  FixedSizeList
>;

export type DefaultTreeState = TreeState<
  NodeData,
  NodePublicState<NodeData>,
  FixedSizeList
>;

export type DefaultTreeCreatorOptions = TreeCreatorOptions<
  NodeData,
  NodePublicState<NodeData>,
  DefaultTreeState
>;

// eslint-disable-next-line @typescript-eslint/no-empty-function
export const noop = (): void => {};

export const identity = <T>(value: T): T => value;

export const createBasicRecord = <
  TData extends NodeData,
  TNodePublicState extends NodePublicState<TData>
>(
  pub: TNodePublicState,
  parent: NodeRecord<TNodePublicState> | null = null
): NodeRecord<TNodePublicState> => ({
  child: null,
  isShown: parent ? parent.public.isOpen && parent.isShown : true,
  parent,
  public: pub,
  sibling: null,
  visited: false,
});

export const getIdByIndex = <
  TData extends NodeData,
  TNodePublicState extends NodePublicState<TData>
>(
  index: number,
  { getRecordData }: TypedListChildComponentData<TData, TNodePublicState>
): string => {
  const {
    data: { id },
  } = getRecordData(index);

  return id;
};

export const mergeRefs =
  <T>(
    refs: Array<React.MutableRefObject<T> | React.LegacyRef<T>>
  ): React.RefCallback<T> =>
  (value) => {
    refs.forEach((ref) => {
      if (typeof ref === 'function') {
        ref(value);
      } else if (ref != null) {
        // eslint-disable-next-line no-param-reassign
        (ref as React.MutableRefObject<T | null>).current = value;
      }
    });
  };
