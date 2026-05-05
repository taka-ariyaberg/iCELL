import { describe, it, expect, vi, beforeEach } from 'vitest';
import { usePlateStore, GroupNameCollisionError } from './plateStore';

function resetStore() {
  usePlateStore.setState({
    plateType: '96',
    wells: {},
    selectedWells: new Set(),
    groups: {},
    dyePrograms: {},
    history: [],
    future: [],
  });
}

describe('GroupNameCollisionError', () => {
  beforeEach(resetStore);

  it('is an Error with the colliding name in its message', () => {
    const err = new GroupNameCollisionError('Group 1');
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toContain('Group 1');
    expect(err.name).toBe('GroupNameCollisionError');
  });
});

describe('invariant guard (via direct setState)', () => {
  beforeEach(resetStore);

  it('logs console.error when wells reference a missing group', () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    // Deliberately violate the invariant: a well points at a group that does not exist.
    // We trigger the guard by calling an action that runs it; here we use createOrUpdateGroup
    // (which we will wire to the guard in Task 4). For now this test will fail because
    // createOrUpdateGroup does not yet call the guard. That is expected — Task 4 makes it pass.
    usePlateStore.setState({
      ...usePlateStore.getState(),
      wells: { A1: 'Ghost' },
      groups: {},
    });
    usePlateStore.getState().createOrUpdateGroup('Real', 500);
    expect(errSpy).toHaveBeenCalledWith(
      '[plateStore] invariant violated: orphan well→group references',
      [{ well: 'A1', missingGroup: 'Ghost' }],
    );
    errSpy.mockRestore();
  });
});

describe('renameGroup', () => {
  beforeEach(resetStore);

  it('renames the group key, updates GroupDefinition.name, and rewrites referencing wells', () => {
    usePlateStore.setState({
      ...usePlateStore.getState(),
      groups: {
        'Group 1': { name: 'Group 1', density: 500 },
        Other: { name: 'Other', density: 500 },
      },
      wells: { A1: 'Group 1', A2: 'Group 1', B1: 'Other' },
    });

    usePlateStore.getState().renameGroup('Group 1', 'Control');

    const s = usePlateStore.getState();
    expect(s.groups['Control']).toEqual({ name: 'Control', density: 500 });
    expect(s.groups['Group 1']).toBeUndefined();
    expect(s.wells).toEqual({ A1: 'Control', A2: 'Control', B1: 'Other' });
  });

  it('throws GroupNameCollisionError when target name exists on another group', () => {
    usePlateStore.setState({
      ...usePlateStore.getState(),
      groups: {
        A: { name: 'A', density: 500 },
        B: { name: 'B', density: 600 },
      },
      wells: { A1: 'A', B1: 'B' },
    });
    expect(() => usePlateStore.getState().renameGroup('A', 'B')).toThrow(GroupNameCollisionError);
    const s = usePlateStore.getState();
    expect(Object.keys(s.groups).sort()).toEqual(['A', 'B']);
    expect(s.wells).toEqual({ A1: 'A', B1: 'B' });
  });

  it('is a no-op when newName equals oldName', () => {
    usePlateStore.setState({
      ...usePlateStore.getState(),
      groups: { A: { name: 'A', density: 500 } },
      wells: { A1: 'A' },
    });
    const before = usePlateStore.getState();
    usePlateStore.getState().renameGroup('A', 'A');
    const after = usePlateStore.getState();
    expect(after.groups).toEqual(before.groups);
    expect(after.wells).toEqual(before.wells);
    expect(after.history).toEqual(before.history);
  });

  it('throws when newName is empty or whitespace-only', () => {
    usePlateStore.setState({
      ...usePlateStore.getState(),
      groups: { A: { name: 'A', density: 500 } },
      wells: { A1: 'A' },
    });
    expect(() => usePlateStore.getState().renameGroup('A', '')).toThrow(/empty/);
    expect(() => usePlateStore.getState().renameGroup('A', '   ')).toThrow(/empty/);
  });

  it('trims whitespace on the new name', () => {
    usePlateStore.setState({
      ...usePlateStore.getState(),
      groups: { A: { name: 'A', density: 500 } },
      wells: { A1: 'A' },
    });
    usePlateStore.getState().renameGroup('A', '  Control  ');
    expect(usePlateStore.getState().groups['Control']).toBeDefined();
    expect(usePlateStore.getState().groups['  Control  ']).toBeUndefined();
  });

  it('logs console.error and is a no-op when source group does not exist', () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    usePlateStore.setState({
      ...usePlateStore.getState(),
      groups: { A: { name: 'A', density: 500 } },
      wells: {},
    });
    usePlateStore.getState().renameGroup('Nonexistent', 'Whatever');
    expect(errSpy).toHaveBeenCalled();
    expect(usePlateStore.getState().groups['A']).toBeDefined();
    errSpy.mockRestore();
  });

  it('pushes a history entry so undo restores the prior name', () => {
    usePlateStore.setState({
      ...usePlateStore.getState(),
      groups: { A: { name: 'A', density: 500 } },
      wells: { A1: 'A' },
      history: [],
    });
    usePlateStore.getState().renameGroup('A', 'B');
    expect(usePlateStore.getState().groups['B']).toBeDefined();
    usePlateStore.getState().undo();
    expect(usePlateStore.getState().groups['A']).toBeDefined();
    expect(usePlateStore.getState().groups['B']).toBeUndefined();
    expect(usePlateStore.getState().wells).toEqual({ A1: 'A' });
  });
});

describe('updateGroupDensity', () => {
  beforeEach(resetStore);

  it('updates only the density field on the named group', () => {
    usePlateStore.setState({
      ...usePlateStore.getState(),
      groups: {
        A: { name: 'A', density: 500 },
        B: { name: 'B', density: 600 },
      },
      wells: { A1: 'A', B1: 'B' },
    });
    usePlateStore.getState().updateGroupDensity('A', 750);
    const s = usePlateStore.getState();
    expect(s.groups['A']).toEqual({ name: 'A', density: 750 });
    expect(s.groups['B']).toEqual({ name: 'B', density: 600 });
    expect(s.wells).toEqual({ A1: 'A', B1: 'B' });
  });

  it('logs console.error and does not mutate when group does not exist', () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    usePlateStore.setState({
      ...usePlateStore.getState(),
      groups: { A: { name: 'A', density: 500 } },
      wells: { A1: 'A' },
    });
    usePlateStore.getState().updateGroupDensity('Nonexistent', 999);
    expect(errSpy).toHaveBeenCalled();
    expect(usePlateStore.getState().groups['A']).toEqual({ name: 'A', density: 500 });
    expect(Object.keys(usePlateStore.getState().groups)).toEqual(['A']);
    errSpy.mockRestore();
  });

  it('pushes history so undo restores the prior density', () => {
    usePlateStore.setState({
      ...usePlateStore.getState(),
      groups: { A: { name: 'A', density: 500 } },
      wells: { A1: 'A' },
      history: [],
    });
    usePlateStore.getState().updateGroupDensity('A', 750);
    expect(usePlateStore.getState().groups['A'].density).toBe(750);
    usePlateStore.getState().undo();
    expect(usePlateStore.getState().groups['A'].density).toBe(500);
  });
});
