

export type ProjectType = 'software' | 'construction' | 'marketing' | 'consulting' | 'research' | 'general';

export interface ProjectTemplate {
    type: ProjectType;
    name: string;
    icon: string;
    description: string;
    defaultFields: string[];
    suggestedSkills: string[];
    typicalMilestones: string[];
}

export const PROJECT_TEMPLATES: Record<ProjectType, ProjectTemplate> = {
    software: {
        type: 'software',
        name: 'Software Development',
        icon: '💻',
        description: 'Web apps, mobile apps, APIs, and software products',
        defaultFields: [
            'tech_stack',
            'deployment_environment',
            'testing_requirements',
            'security_requirements',
            'scalability_requirements'
        ],
        suggestedSkills: [
            'Frontend Development',
            'Backend Development',
            'UI/UX Design',
            'QA Testing',
            'DevOps',
            'Database Design'
        ],
        typicalMilestones: [
            'Requirements & Design',
            'Development Sprint 1',
            'Development Sprint 2',
            'Testing & QA',
            'Deployment & Launch'
        ]
    },

    construction: {
        type: 'construction',
        name: 'Construction Project',
        icon: '🏗️',
        description: 'Building, renovation, and infrastructure projects',
        defaultFields: [
            'site_location',
            'permits_required',
            'materials_list',
            'safety_requirements',
            'environmental_impact'
        ],
        suggestedSkills: [
            'Project Management',
            'Civil Engineering',
            'Architecture',
            'Electrical Work',
            'Plumbing',
            'Safety Compliance'
        ],
        typicalMilestones: [
            'Site Preparation',
            'Foundation Work',
            'Structural Work',
            'Interior Finishing',
            'Final Inspection'
        ]
    },

    marketing: {
        type: 'marketing',
        name: 'Marketing Campaign',
        icon: '📢',
        description: 'Marketing campaigns, branding, and promotional projects',
        defaultFields: [
            'target_audience',
            'channels',
            'campaign_goals',
            'kpis',
            'content_calendar'
        ],
        suggestedSkills: [
            'Content Creation',
            'Social Media Management',
            'SEO/SEM',
            'Graphic Design',
            'Analytics',
            'Copywriting'
        ],
        typicalMilestones: [
            'Strategy & Planning',
            'Content Creation',
            'Campaign Launch',
            'Monitoring & Optimization',
            'Results Analysis'
        ]
    },

    consulting: {
        type: 'consulting',
        name: 'Consulting Engagement',
        icon: '💼',
        description: 'Business consulting, advisory, and strategic projects',
        defaultFields: [
            'engagement_scope',
            'deliverables',
            'stakeholder_map',
            'change_management',
            'knowledge_transfer'
        ],
        suggestedSkills: [
            'Business Analysis',
            'Strategy Development',
            'Change Management',
            'Stakeholder Management',
            'Presentation Skills',
            'Research & Analysis'
        ],
        typicalMilestones: [
            'Discovery & Assessment',
            'Analysis & Recommendations',
            'Implementation Planning',
            'Execution Support',
            'Knowledge Transfer'
        ]
    },

    research: {
        type: 'research',
        name: 'Research Project',
        icon: '🔬',
        description: 'Academic research, R&D, and investigative projects',
        defaultFields: [
            'research_questions',
            'methodology',
            'data_sources',
            'ethics_approval',
            'publication_plan'
        ],
        suggestedSkills: [
            'Research Methodology',
            'Data Analysis',
            'Statistical Analysis',
            'Technical Writing',
            'Literature Review',
            'Peer Review'
        ],
        typicalMilestones: [
            'Literature Review',
            'Research Design',
            'Data Collection',
            'Analysis',
            'Publication & Dissemination'
        ]
    },

    general: {
        type: 'general',
        name: 'General Project',
        icon: '📋',
        description: 'General purpose project template',
        defaultFields: [
            'objectives',
            'deliverables',
            'stakeholders',
            'success_metrics'
        ],
        suggestedSkills: [
            'Project Management',
            'Communication',
            'Problem Solving',
            'Time Management'
        ],
        typicalMilestones: [
            'Planning',
            'Execution Phase 1',
            'Execution Phase 2',
            'Review & Completion'
        ]
    }
};

export function getProjectTemplate(type: ProjectType | string): ProjectTemplate {
    const normalizedType = (type || 'general').toLowerCase() as ProjectType;
    return PROJECT_TEMPLATES[normalizedType] || PROJECT_TEMPLATES.general;
}

export function getAllTemplates(): ProjectTemplate[] {
    return Object.values(PROJECT_TEMPLATES);
}

export function detectProjectType(content: string): ProjectType {
    const lowerContent = content.toLowerCase();

    if (lowerContent.match(/\b(software|app|api|website|frontend|backend|database|deployment)\b/gi)) {
        return 'software';
    }

    if (lowerContent.match(/\b(construction|building|renovation|contractor|site|permits|materials)\b/gi)) {
        return 'construction';
    }

    if (lowerContent.match(/\b(marketing|campaign|branding|social media|seo|advertising|content)\b/gi)) {
        return 'marketing';
    }

    if (lowerContent.match(/\b(consulting|advisory|strategy|engagement|stakeholder|business analysis)\b/gi)) {
        return 'consulting';
    }

    if (lowerContent.match(/\b(research|study|methodology|data collection|analysis|publication)\b/gi)) {
        return 'research';
    }

    return 'general';
}

export function getSuggestedFields(type: ProjectType): string[] {
    const template = getProjectTemplate(type);
    return template.defaultFields;
}

export function getSuggestedSkills(type: ProjectType): string[] {
    const template = getProjectTemplate(type);
    return template.suggestedSkills;
}
