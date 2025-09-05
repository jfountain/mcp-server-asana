import { AsanaClientWrapper } from './asana-client-wrapper.js';
import { formatProject, formatCustomFieldSettings } from './utils/asana-format.js';

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
      const project = await asanaClient.getProject(id, {
        opt_fields: "name,gid,resource_type,created_at,modified_at,archived,public,notes,color,default_view,due_date,due_on,start_on,workspace,team"
      });

      let sections = [];
      try {
        sections = await asanaClient.getProjectSections(id, {
          opt_fields: "name,gid,created_at"
        });
      } catch (sectionError) {
        console.error(`Error fetching sections for project ${id}:`, sectionError);
      }

      let customFields = [];
      try {
        const customFieldSettings = await asanaClient.getProjectCustomFieldSettings(id, {
          opt_fields: "custom_field.name,custom_field.gid,custom_field.resource_type,custom_field.type,custom_field.description,custom_field.enum_options,custom_field.enum_options.gid,custom_field.enum_options.name,custom_field.enum_options.enabled,custom_field.precision,custom_field.format"
        });

        customFields = formatCustomFieldSettings(customFieldSettings);
      } catch (customFieldError) {
        console.error(`Error fetching custom fields for project ${id}:`, customFieldError);
      }

      const projectData = formatProject(project, sections, customFields);

      resource = {
        id: project.gid,
        type: 'project',
        title: project.name,
        content: {
          mimeType: 'application/json',
          text: JSON.stringify(projectData, null, 2)
        }
      };
    } else {
      throw new Error(`Unsupported fetch type: ${type}`);
    }

    return { resource };
  };
}
