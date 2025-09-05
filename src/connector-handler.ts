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

export function fetchHandler(_asanaClient: AsanaClientWrapper) {
  return async (request: any): Promise<any> => {
    console.error("Received FetchRequest:", request);
    return { resource: null };
  };
}
