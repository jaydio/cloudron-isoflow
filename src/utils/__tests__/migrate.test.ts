import { migrateModel, isV2ModelShape } from '../migrate';
import { modelSchema } from '../../schemas/model';

const v1Model = {
  version: '',
  title: 'Untitled',
  colors: [{ id: '__DEFAULT__', value: '#fff' }],
  icons: [{ id: 'office', name: 'office', url: '' }],
  items: [
    { id: 'vi-1', name: 'Node A', icon: 'office' },
    { id: 'vi-2', name: 'Node B', icon: 'office' }
  ],
  views: [
    {
      id: 'view-1',
      name: 'Untitled view',
      items: [
        { id: 'vi-1', tile: { x: 0, y: 0 } },
        { id: 'vi-2', tile: { x: 1, y: 1 } }
      ],
      connectors: [
        {
          id: 'c-1',
          anchors: [
            { id: 'a-1', ref: { item: 'vi-1' } },
            { id: 'a-2', ref: { item: 'vi-2' } }
          ]
        }
      ]
    }
  ]
};

const v2Model = {
  version: '2.3.0',
  title: 'Untitled',
  colors: [{ id: '__DEFAULT__', value: '#fff' }],
  icons: [{ id: 'office', name: 'office', url: '' }],
  components: [
    { id: 'comp-A', name: 'Node A', icon: 'office', tags: [] },
    { id: 'comp-B', name: 'Node B', icon: 'office', tags: [] }
  ],
  tags: [],
  views: [
    {
      id: 'view-1',
      name: 'Untitled view',
      items: [
        { id: 'vi-1', tile: { x: 0, y: 0 }, component: 'comp-A' },
        { id: 'vi-2', tile: { x: 1, y: 1 }, component: 'comp-A' },
        { id: 'vi-3', tile: { x: 2, y: 2 }, component: 'comp-B' }
      ],
      connectors: [
        {
          id: 'c-1',
          anchors: [
            { id: 'a-1', ref: { item: 'vi-1' } },
            { id: 'a-2', ref: { item: 'vi-3' } }
          ]
        }
      ]
    }
  ]
};

describe('migrateModel', () => {
  test('isV2ModelShape detects v2 vs v1', () => {
    expect(isV2ModelShape(v2Model)).toBe(true);
    expect(isV2ModelShape(v1Model)).toBe(false);
    expect(isV2ModelShape(null)).toBe(false);
    expect(isV2ModelShape({})).toBe(false);
  });

  test('passes v1 input through unchanged', () => {
    expect(migrateModel(v1Model)).toBe(v1Model);
  });

  test('migrates a v2.3.0 model to a v1 shape that passes modelSchema', () => {
    const migrated = migrateModel(v2Model) as unknown as typeof v1Model;

    expect(Array.isArray(migrated.items)).toBe(true);
    expect('components' in (migrated as unknown as Record<string, unknown>)).toBe(false);
    expect('tags' in (migrated as unknown as Record<string, unknown>)).toBe(false);

    // Each viewItem.id has a corresponding model item; the same component
    // referenced twice expands into two distinct model items.
    const ids = migrated.items.map((i) => i.id).sort();
    expect(ids).toEqual(['vi-1', 'vi-2', 'vi-3']);

    // viewItem.component is stripped, viewItem.id preserved.
    const viewItems = migrated.views[0].items as Array<Record<string, unknown>>;
    for (const vi of viewItems) {
      expect('component' in vi).toBe(false);
      expect(typeof vi.id).toBe('string');
    }

    const result = modelSchema.safeParse(migrated);
    if (!result.success) {
      // eslint-disable-next-line no-console
      console.log(result.error.errors);
    }
    expect(result.success).toBe(true);
  });

  test('anchor refs still resolve after migration', () => {
    const migrated = migrateModel(v2Model) as unknown as typeof v1Model;
    const itemIds = new Set(migrated.items.map((i) => i.id));
    const view = migrated.views[0];
    const viewItemIds = new Set(view.items.map((vi) => vi.id));
    const refIds = (view.connectors ?? []).flatMap((c) => {
      return c.anchors.map((a) => {
        return (a.ref as { item?: string }).item;
      });
    });
    for (const ref of refIds) {
      expect(viewItemIds.has(ref as string)).toBe(true);
      expect(itemIds.has(ref as string)).toBe(true);
    }
  });

  test('unknown component refs are dropped with a warning, no throw', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const broken = {
      ...v2Model,
      views: [
        {
          ...v2Model.views[0],
          items: [
            ...v2Model.views[0].items,
            { id: 'vi-orphan', tile: { x: 9, y: 9 }, component: 'comp-MISSING' }
          ]
        }
      ]
    };

    expect(() => {
      return migrateModel(broken);
    }).not.toThrow();
    const migrated = migrateModel(broken) as unknown as typeof v1Model;
    const ids = migrated.items.map((i) => i.id);
    expect(ids).not.toContain('vi-orphan');
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});
