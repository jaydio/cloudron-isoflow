// Migrates legacy v2.3.0-shaped model JSON to the v1 shape this app validates.
// Forks/newer Isoflow builds export `components` + per-instance viewItem ids
// referencing components via `viewItem.component`. v1 here uses a flat `items`
// array where each `viewItem.id` IS the model-item id. Anchor refs already
// target viewItem ids in v2.3.0, so we preserve those by emitting one v1
// model item per referencing viewItem, keyed by the viewItem's own id.

type UnknownRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is UnknownRecord => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

export const isV2ModelShape = (input: unknown): boolean => {
  if (!isRecord(input)) return false;
  return Array.isArray(input.components) && !Array.isArray(input.items);
};

export const migrateModel = <T>(input: T): T => {
  if (!isV2ModelShape(input)) return input;

  const model = input as UnknownRecord;
  const components = model.components as UnknownRecord[];
  const views = Array.isArray(model.views) ? (model.views as UnknownRecord[]) : [];

  const componentsById = new Map<string, UnknownRecord>();
  for (const component of components) {
    if (isRecord(component) && typeof component.id === 'string') {
      componentsById.set(component.id, component);
    }
  }

  const itemsById = new Map<string, UnknownRecord>();
  const migratedViews = views.map((view) => {
    if (!isRecord(view)) return view;
    const viewItems = Array.isArray(view.items) ? (view.items as UnknownRecord[]) : [];

    const migratedViewItems = viewItems.map((viewItem) => {
      if (!isRecord(viewItem)) return viewItem;
      const { component: componentRef, ...rest } = viewItem;

      if (typeof componentRef === 'string' && typeof rest.id === 'string') {
        const component = componentsById.get(componentRef);
        if (component) {
          if (!itemsById.has(rest.id)) {
            const { tags: _tags, id: _componentId, ...componentRest } = component;
            itemsById.set(rest.id, { ...componentRest, id: rest.id });
          }
        } else {
          // eslint-disable-next-line no-console
          console.warn(
            `[isoflow:migrate] viewItem ${rest.id} references unknown component ${componentRef}; dropping reference.`
          );
        }
      }

      return rest;
    });

    return { ...view, items: migratedViewItems };
  });

  const { components: _components, tags: _tags, ...modelRest } = model;

  return {
    ...modelRest,
    items: Array.from(itemsById.values()),
    views: migratedViews
  } as unknown as T;
};
