import {
  ListResourcesResult,
  ListResourceTemplatesResult,
  ReadResourceResult,
  ReadResourceRequest
} from "@modelcontextprotocol/sdk/types.js";
import { AsanaClientWrapper } from './asana-client-wrapper.js';
import { formatWorkspace, formatProject, formatCustomFieldSettings } from './utils/asana-format.js';

export function createResourceHandlers(asanaClient: AsanaClientWrapper) {
  /**
   * Lists available resources (workspaces and resource templates)
   */
  const listResources = async (): Promise<ListResourcesResult> => {
    console.error("Received ListResourcesRequest");
    try {
      // Fetch all workspaces from Asana
      const workspaces = await asanaClient.listWorkspaces({
        opt_fields: "name,gid,resource_type"
      });

      // Transform workspaces into resources
      const workspaceResources = workspaces.map((workspace: any) => ({
        uri: `asana://workspace/${workspace.gid}`,
        name: workspace.name,
        description: `Asana workspace: ${workspace.name}`
      }));

      // Add resource templates
      const resourceTemplates = [
        {
          uriTemplate: "asana://project/{project_gid}",
          name: "Asana Project Template",
          description: "Get details for a specific Asana project by GID",
          mimeType: "application/json"
        }
      ];

      return {
        resources: workspaceResources,
        resourceTemplates: resourceTemplates
      };
    } catch (error) {
      console.error("Error listing resources:", error);
      return { resources: [] };
    }
  };

  /**
   * Reads a resource (workspace details or project details)
   */
  const readResource = async (request: ReadResourceRequest): Promise<ReadResourceResult> => {
    console.error("Received ReadResourceRequest:", request);
    try {
      const { uri } = request.params;

      // Parse workspace URI
      const workspaceMatch = uri.match(/^asana:\/\/workspace\/([^\/]+)$/);
      if (workspaceMatch) {
        return await readWorkspaceResource(workspaceMatch[1], uri);
      }

      // Parse project URI
      const projectMatch = uri.match(/^asana:\/\/project\/([^\/]+)$/);
      if (projectMatch) {
        return await readProjectResource(projectMatch[1], uri);
      }

      throw new Error(`Invalid resource URI format: ${uri}`);
    } catch (error) {
      console.error("Error reading resource:", error);
      throw error;
    }
  };

  /**
   * Read workspace resource
   */
  const readWorkspaceResource = async (workspaceId: string, uri: string): Promise<ReadResourceResult> => {
    // Get workspace details
    const workspaces = await asanaClient.listWorkspaces({
      opt_fields: "name,gid,resource_type,email_domains,is_organization"
    });

    const workspace = workspaces.find((ws: any) => ws.gid === workspaceId);

    if (!workspace) {
      throw new Error(`Workspace not found: ${workspaceId}`);
    }

    // Format the workspace data
    const workspaceData = formatWorkspace(workspace);

    return {
      contents: [
        {
          uri,
          mimeType: "application/json",
          text: JSON.stringify(workspaceData, null, 2)
        }
      ]
    };
  };

  /**
   * Read project resource
   */
  const readProjectResource = async (projectId: string, uri: string): Promise<ReadResourceResult> => {
    try {
      // Get project details
      const project = await asanaClient.getProject(projectId, {
        opt_fields: "name,gid,resource_type,created_at,modified_at,archived,public,notes,color,default_view,due_date,due_on,start_on,workspace,team"
      });

      if (!project) {
        throw new Error(`Project not found: ${projectId}`);
      }

      // Get project sections - handle potential errors
      let sections = [];
      try {
        sections = await asanaClient.getProjectSections(projectId, {
          opt_fields: "name,gid,created_at"
        });
      } catch (sectionError) {
        console.error(`Error fetching sections for project ${projectId}:`, sectionError);
        // Continue with empty sections array
      }

      // Get custom field settings directly
      let customFields = [];
      try {
        const customFieldSettings = await asanaClient.getProjectCustomFieldSettings(projectId, {
          opt_fields: "custom_field.name,custom_field.gid,custom_field.resource_type,custom_field.type,custom_field.description,custom_field.enum_options,custom_field.enum_options.gid,custom_field.enum_options.name,custom_field.enum_options.enabled,custom_field.precision,custom_field.format"
        });

        customFields = formatCustomFieldSettings(customFieldSettings);
      } catch (customFieldError) {
        console.error(`Error fetching custom fields for project ${projectId}:`, customFieldError);
        // Continue with empty customFields array
      }

      // Format project data with sections and custom fields
      const projectData = formatProject(project, sections, customFields);

      return {
        contents: [
          {
            uri,
            mimeType: "application/json",
            text: JSON.stringify(projectData, null, 2)
          }
        ]
      };
    } catch (error) {
      console.error(`Error reading project ${projectId}:`, error);
      throw new Error(`Failed to read project: ${error.message}`);
    }
  };

  /**
   * Lists available resource templates (project template)
   */
  const listResourceTemplates = async (): Promise<ListResourceTemplatesResult> => {
    console.error("Received ListResourceTemplatesRequest");
    try {
      // Define resource templates
      const resourceTemplates = [
        {
          uriTemplate: "asana://project/{project_gid}",
          name: "Asana Project Template",
          description: "Get details for a specific Asana project by GID",
          mimeType: "application/json"
        }
      ];

      return { resourceTemplates };
    } catch (error) {
      console.error("Error listing resource templates:", error);
      return { resourceTemplates: [] };
    }
  };

  return {
    listResources,
    listResourceTemplates,
    readResource
  };
}
