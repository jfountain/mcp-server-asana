export function formatWorkspace(workspace: any) {
  if (!workspace) return null;
  return {
    name: workspace.name,
    id: workspace.gid,
    type: workspace.resource_type,
    is_organization: workspace.is_organization,
    email_domains: workspace.email_domains,
  };
}

export function formatCustomFieldSettings(settings: any[]): any[] {
  if (!Array.isArray(settings)) return [];
  return settings
    .filter((setting: any) => setting && setting.custom_field)
    .map((setting: any) => {
      const field = setting.custom_field;
      const fieldData: any = {
        gid: field.gid || null,
        name: field.name || null,
        type: field.resource_type || null,
        field_type: field.type || null,
        description: field.description || null,
      };

      switch (field.type) {
        case 'enum':
        case 'multi_enum':
          if (Array.isArray(field.enum_options)) {
            fieldData.enum_options = field.enum_options
              .filter((option: any) => option.enabled !== false)
              .map((option: any) => ({
                gid: option.gid || null,
                name: option.name || null,
              }));
          }
          break;
        case 'number':
          fieldData.precision = field.precision || 0;
          break;
        case 'text':
        case 'date':
        case 'people':
          // No special handling needed
          break;
      }

      return fieldData;
    });
}

export function formatProject(project: any, sections: any[] = [], customFields: any[] = []) {
  if (!project) return null;
  return {
    name: project.name || null,
    id: project.gid || null,
    type: project.resource_type || null,
    created_at: project.created_at || null,
    modified_at: project.modified_at || null,
    archived: project.archived || false,
    public: project.public || false,
    notes: project.notes || null,
    color: project.color || null,
    default_view: project.default_view || null,
    due_date: project.due_date || null,
    due_on: project.due_on || null,
    start_on: project.start_on || null,
    workspace: project.workspace
      ? {
          gid: project.workspace.gid || null,
          name: project.workspace.name || null,
        }
      : null,
    team: project.team
      ? {
          gid: project.team.gid || null,
          name: project.team.name || null,
        }
      : null,
    sections: sections.map((section: any) => ({
      gid: section.gid || null,
      name: section.name || null,
      created_at: section.created_at || null,
    })),
    custom_fields: customFields,
  };
}
