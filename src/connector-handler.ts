import { AsanaClientWrapper } from './asana-client-wrapper.js';

export function searchHandler(asanaClient: AsanaClientWrapper) {
  return async (request: any): Promise<any> => {
    console.error("Received SearchRequest:", request);

    const params = request.params || {};
    const { type, workspace, query, page } = params;

    if (!type || !workspace || !query) {
      throw new Error("Missing required parameters: type, workspace, or query");
    }

    const limit = page?.limit;
    const cursor = page?.cursor;
    const opts: any = {};
    if (limit !== undefined) opts.limit = limit;
    if (cursor !== undefined) opts.offset = cursor;

    let results: any[] = [];
    if (type === 'project') {
      results = await asanaClient.searchProjects(workspace, query, false, opts);
    } else if (type === 'task') {
      results = await asanaClient.searchTasks(workspace, { text: query, ...opts });
    } else {
      throw new Error(`Unsupported search type: ${type}`);
    }

    const items = results.map((item: any) => ({
      id: item.gid,
      title: item.name,
      summary: item.notes || ''
    }));

    let response: any = { items };
    if (limit && results.length === limit) {
      const nextCursor = cursor ? String(cursor) : String(results.length);
      response.nextPage = { cursor: nextCursor };
    }

    return response;
  };
}

export function fetchHandler(asanaClient: AsanaClientWrapper) {
  return async (request: any): Promise<any> => {
    console.error("Received FetchRequest:", request);

    const params = request.params || {};
    const { id, type } = params;

    if (!id || !type) {
      throw new Error("Missing required parameters: id or type");
    }

    let resource: any;
    if (type === 'task') {
      const task = await asanaClient.getTask(id);
      resource = {
        id: task.gid,
        type: 'task',
        title: task.name,
        content: {
          mimeType: 'application/json',
          text: JSON.stringify(task, null, 2)
        }
      };
    } else if (type === 'project') {
      const project = await asanaClient.getProject(id);
      resource = {
        id: project.gid,
        type: 'project',
        title: project.name,
        content: {
          mimeType: 'application/json',
          text: JSON.stringify(project, null, 2)
        }
      };
    } else {
      throw new Error(`Unsupported fetch type: ${type}`);
    }

    return { resource };
  };
}
