import {mount, ReactWrapper} from 'enzyme';
import React, {FC} from 'react';
import {FixedSizeList} from 'react-window';
import {
  FixedSizeNodeComponentProps,
  FixedSizeNodeData,
  FixedSizeNodeRecord,
  FixedSizeTree,
  FixedSizeTreeProps,
  FixedSizeTreeState,
  Row,
} from '../src';

type DataNode = Readonly<{
  children?: DataNode[];
  id: string;
  name: string;
}>;

type StackElement = Readonly<{
  nestingLevel: number;
  node: DataNode;
}>;

type ExtendedData = FixedSizeNodeData &
  Readonly<{
    name: string;
    nestingLevel: number;
  }>;

describe('FixedSizeTree', () => {
  const Node: FC<FixedSizeNodeComponentProps<ExtendedData>> = () => null;

  let component: ReactWrapper<
    FixedSizeTreeProps<ExtendedData>,
    FixedSizeTreeState<ExtendedData>,
    FixedSizeTree<ExtendedData>
  >;
  let tree: DataNode;
  let treeWalkerSpy: jest.Mock;
  let isOpenByDefault: boolean;

  function* treeWalker(
    refresh: boolean,
  ): Generator<ExtendedData | string | symbol, void, boolean> {
    const stack: StackElement[] = [];

    stack.push({
      nestingLevel: 0,
      node: tree,
    });

    while (stack.length !== 0) {
      const {node, nestingLevel} = stack.pop()!;
      const id = node.id.toString();

      const childrenCount = node.children ? node.children.length : 0;

      const isOpened = yield refresh
        ? {
            id,
            isOpenByDefault,
            name: node.name,
            nestingLevel,
          }
        : id;

      if (childrenCount && isOpened) {
        for (let i = childrenCount - 1; i >= 0; i--) {
          stack.push({
            nestingLevel: nestingLevel + 1,
            node: node.children![i],
          });
        }
      }
    }
  }

  const mountComponent = (): typeof component =>
    mount(
      <FixedSizeTree<ExtendedData>
        itemSize={30}
        treeWalker={treeWalkerSpy}
        height={500}
        width={500}
      >
        {Node}
      </FixedSizeTree>,
    );

  beforeEach(() => {
    tree = {
      children: [
        {id: 'foo-2', name: 'Foo #2'},
        {id: 'foo-3', name: 'Foo #3'},
      ],
      id: 'foo-1',
      name: 'Foo #1',
    };

    isOpenByDefault = true;

    treeWalkerSpy = jest.fn(treeWalker);

    component = mountComponent();
  });

  it('renders a component', () => {
    expect(component).not.toBeUndefined();
  });

  it('contains a FixedSizeList component', () => {
    const list = component.find(FixedSizeList);
    expect(list).toHaveLength(1);
    expect(list.props()).toMatchObject({
      children: Row,
      itemCount: 3,
      itemData: {
        component: Node,
        order: ['foo-1', 'foo-2', 'foo-3'],
        records: {
          'foo-1': {
            data: {
              id: 'foo-1',
              isOpenByDefault: true,
              name: 'Foo #1',
              nestingLevel: 0,
            },
            isOpen: true,
            toggle: expect.any(Function),
          },
          'foo-2': {
            data: {
              id: 'foo-2',
              isOpenByDefault: true,
              name: 'Foo #2',
              nestingLevel: 1,
            },
            isOpen: true,
            toggle: expect.any(Function),
          },
          'foo-3': {
            data: {
              id: 'foo-3',
              isOpenByDefault: true,
              name: 'Foo #3',
              nestingLevel: 1,
            },
            isOpen: true,
            toggle: expect.any(Function),
          },
        },
      },
      itemSize: 30,
    });
  });

  it('allows providing custom row component', () => {
    const rowComponent = () => null;
    component = mount(
      <FixedSizeTree {...component.props()} rowComponent={rowComponent} />,
    );

    expect(component.find(FixedSizeList).prop('children')).toBe(rowComponent);
  });

  it('recomputes on new treeWalker', () => {
    treeWalkerSpy = jest.fn(treeWalker);

    component.setProps({
      treeWalker: treeWalkerSpy,
    });

    expect(treeWalkerSpy).toHaveBeenCalledWith(true);
  });

  it('does not recompute if treeWalker is the same', () => {
    treeWalkerSpy.mockClear();

    component.setProps({
      treeWalker: treeWalkerSpy,
    });

    expect(treeWalkerSpy).not.toHaveBeenCalled();
  });

  describe('component instance', () => {
    let treeInstance: FixedSizeTree<ExtendedData>;

    beforeEach(() => {
      treeInstance = component.instance();
    });

    describe('scrollTo', () => {
      let listInstance: FixedSizeList;

      beforeEach(() => {
        listInstance = component
          .find(FixedSizeList)
          .instance() as FixedSizeList;
      });

      it('can scroll to a specific offset', () => {
        const scrollToSpy = jest.spyOn(listInstance, 'scrollTo');
        treeInstance.scrollTo(200);
        expect(scrollToSpy).toHaveBeenCalledWith(200);
      });

      it('can scroll to an item', () => {
        const scrollToItemSpy = jest.spyOn(listInstance, 'scrollToItem');
        treeInstance.scrollToItem('foo-3', 'auto');
        expect(scrollToItemSpy).toHaveBeenCalledWith(2, 'auto');
      });
    });

    describe('recomputeTree', () => {
      it('updates tree order', async () => {
        tree = {
          children: [
            {id: 'foo-3', name: 'Foo #3'},
            {id: 'foo-2', name: 'Foo #2'},
          ],
          id: 'foo-1',
          name: 'Foo #1',
        };

        await treeInstance.recomputeTree();
        component.update(); // Update the wrapper to get the latest changes

        expect(component.find(FixedSizeList).prop('itemData')).toMatchObject({
          component: Node,
          order: ['foo-1', 'foo-3', 'foo-2'],
          records: {
            'foo-1': {
              data: {
                id: 'foo-1',
                isOpenByDefault: true,
                name: 'Foo #1',
                nestingLevel: 0,
              },
              isOpen: true,
              toggle: expect.any(Function),
            },
            'foo-2': {
              data: {
                id: 'foo-2',
                isOpenByDefault: true,
                name: 'Foo #2',
                nestingLevel: 1,
              },
              isOpen: true,
              toggle: expect.any(Function),
            },
            'foo-3': {
              data: {
                id: 'foo-3',
                isOpenByDefault: true,
                name: 'Foo #3',
                nestingLevel: 1,
              },
              isOpen: true,
              toggle: expect.any(Function),
            },
          },
          treeData: undefined,
        });
      });

      it('updates tree nodes metadata', async () => {
        tree = {
          children: [
            {id: 'foo-3', name: 'Foo #3 Bar'},
            {id: 'foo-2', name: 'Foo #2 Bar'},
          ],
          id: 'foo-1',
          name: 'Foo #1 Bar',
        };

        await treeInstance.recomputeTree({refreshNodes: true});
        component.update(); // Update the wrapper to get the latest changes

        expect(component.find(FixedSizeList).prop('itemData')).toMatchObject({
          component: Node,
          order: ['foo-1', 'foo-3', 'foo-2'],
          records: {
            'foo-1': {
              data: {
                id: 'foo-1',
                isOpenByDefault: true,
                name: 'Foo #1 Bar',
                nestingLevel: 0,
              },
              isOpen: true,
              toggle: expect.any(Function),
            },
            'foo-2': {
              data: {
                id: 'foo-2',
                isOpenByDefault: true,
                name: 'Foo #2 Bar',
                nestingLevel: 1,
              },
              isOpen: true,
              toggle: expect.any(Function),
            },
            'foo-3': {
              data: {
                id: 'foo-3',
                isOpenByDefault: true,
                name: 'Foo #3 Bar',
                nestingLevel: 1,
              },
              isOpen: true,
              toggle: expect.any(Function),
            },
          },
          treeData: undefined,
        });
      });

      it('resets current openness to default', async () => {
        const records = component.state('records');

        for (const id in records) {
          records[id]!.isOpen = false;
        }

        // Imitate closing the foo-1 node
        component.setState({
          order: ['foo-1'],
          records,
        });

        await treeInstance.recomputeTree({useDefaultOpenness: true});
        component.update(); // Update the wrapper to get the latest changes

        // foo-1 node is open again
        expect(component.find(FixedSizeList).prop('itemData')).toMatchObject({
          component: Node,
          order: ['foo-1', 'foo-2', 'foo-3'],
          records: {
            'foo-1': {
              data: {
                id: 'foo-1',
                isOpenByDefault: true,
                name: 'Foo #1',
                nestingLevel: 0,
              },
              isOpen: true,
              toggle: expect.any(Function),
            },
            'foo-2': {
              data: {
                id: 'foo-2',
                isOpenByDefault: true,
                name: 'Foo #2',
                nestingLevel: 1,
              },
              isOpen: true,
              toggle: expect.any(Function),
            },
            'foo-3': {
              data: {
                id: 'foo-3',
                isOpenByDefault: true,
                name: 'Foo #3',
                nestingLevel: 1,
              },
              isOpen: true,
              toggle: expect.any(Function),
            },
          },
          treeData: undefined,
        });
      });

      it('resets current openness to the new default provided by the node refreshing', async () => {
        isOpenByDefault = false;

        await treeInstance.recomputeTree({
          refreshNodes: true,
          useDefaultOpenness: true,
        });
        component.update(); // Update the wrapper to get the latest changes

        expect(component.find(FixedSizeList).prop('itemData')).toMatchObject({
          component: Node,
          order: ['foo-1'],
          records: {
            'foo-1': {
              data: {
                id: 'foo-1',
                isOpenByDefault: false,
                name: 'Foo #1',
                nestingLevel: 0,
              },
              isOpen: false,
              toggle: expect.any(Function),
            },
            // Child nodes of the closed one are omitted
            'foo-2': {
              data: {
                id: 'foo-2',
                isOpenByDefault: true,
                name: 'Foo #2',
                nestingLevel: 1,
              },
              isOpen: true,
              toggle: expect.any(Function),
            },
            'foo-3': {
              data: {
                id: 'foo-3',
                isOpenByDefault: true,
                name: 'Foo #3',
                nestingLevel: 1,
              },
              isOpen: true,
              toggle: expect.any(Function),
            },
          },
          treeData: undefined,
        });
      });

      it('opens and closes nodes as specified in opennessState', async () => {
        await treeInstance.recomputeTree({
          opennessState: {
            'foo-2': false,
          },
        });

        component.update(); // Update the wrapper to get the latest changes

        let {
          order,
          records: {'foo-1': foo1, 'foo-2': foo2, 'foo-3': foo3},
        }: FixedSizeTreeState<FixedSizeNodeData> = component
          .find(FixedSizeList)
          .prop('itemData');

        expect(order).toEqual(['foo-1', 'foo-2', 'foo-3']);
        expect(foo1!.isOpen).toBeTruthy();
        expect(foo2!.isOpen).not.toBeTruthy();
        expect(foo3!.isOpen).toBeTruthy();

        await treeInstance.recomputeTree({
          opennessState: {
            'foo-2': true,
            'foo-3': false,
          },
        });

        component.update(); // Update the wrapper to get the latest changes

        ({
          order,
          records: {'foo-1': foo1, 'foo-2': foo2, 'foo-3': foo3},
        } = component.find(FixedSizeList).prop('itemData'));

        expect(order).toEqual(['foo-1', 'foo-2', 'foo-3']);
        expect(foo1!.isOpen).toBeTruthy();
        expect(foo2!.isOpen).toBeTruthy();
        expect(foo3!.isOpen).not.toBeTruthy();
      });

      it('opennessState is overridden by useDefaultOpenness', async () => {
        await treeInstance.recomputeTree({
          opennessState: {
            'foo-2': false,
          },
          useDefaultOpenness: true,
        });
        component.update(); // Update the wrapper to get the latest changes

        const {
          records: {'foo-1': foo1, 'foo-2': foo2, 'foo-3': foo3},
        }: FixedSizeTreeState<FixedSizeNodeData> = component
          .find(FixedSizeList)
          .prop('itemData');

        expect(foo1!.isOpen).toBeTruthy();
        expect(foo2!.isOpen).toBeTruthy();
        expect(foo3!.isOpen).toBeTruthy();
      });

      it('opennessState works when node is created during update', async () => {
        component.unmount();
        isOpenByDefault = false;
        component = mountComponent();
        treeInstance = component.instance();

        await treeInstance.recomputeTree({
          opennessState: {
            'foo-1': true,
            'foo-2': true,
            'foo-3': true,
          },
          refreshNodes: true,
        });
        component.update();

        const {records} = component.find(FixedSizeList).prop('itemData') as {
          records: Record<string, FixedSizeNodeRecord<ExtendedData>>;
        };

        expect(Object.keys(records).map((key) => records[key].isOpen)).toEqual([
          true,
          true,
          true,
        ]);
      });
    });

    it('provides a toggle function that changes openness state of the specific node', async () => {
      const foo1 = component.state('records')['foo-1']!;

      treeWalkerSpy.mockClear();

      // Imitate the behavior of Node component where toggle is sent without
      // context
      const {toggle} = foo1;
      await toggle();

      expect(treeWalkerSpy).toHaveBeenCalledWith(false);
      expect(foo1.isOpen).toBeFalsy();
    });
  });
});
