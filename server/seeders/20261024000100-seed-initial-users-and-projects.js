const seededUsers = [
  { id: 'requester', username: 'requester', name: 'Project Requester', email: 'requester@example.com', role: 'requester' },
  { id: 'user-a', username: 'user-a', name: 'User A', email: 'gowrish2011@gmail.com', role: 'approver' },
];

const seededProjects = [
  {
    id: 'project-1001', name: 'Customer Data Platform', customer: 'Siemens',
    customer_contact: 'User 1', description: 'Implementation and integration services.',
  },
  {
    id: 'project-1002', name: 'Cloud Migration', customer: 'Amazon',
    customer_contact: 'Amazon user', description: 'Migration of selected workloads to cloud infrastructure.',
  },
  {
    id: 'project-1003', name: 'Analytics Modernization', customer: 'Google',
    customer_contact: 'Google user', description: 'Modernize reporting and analytics workflows.',
  },
  {
    id: 'project-1004', name: 'Analytics Modernization', customer: 'Microsoft',
    customer_contact: 'Microsoft user', description: 'Modernize reporting and analytics workflows.',
  },
  {
    id: 'project-1005', name: 'Analytics Modernization', customer: 'Meta',
    customer_contact: 'Meta user', description: 'Modernize reporting and analytics workflows.',
  },
];

module.exports = {
  async up(queryInterface) {
    const now = new Date();
    // ignoreDuplicates delegates conflict handling to the database (SQLite OR IGNORE / PostgreSQL ON CONFLICT DO NOTHING).
    await queryInterface.bulkInsert('users', seededUsers.map((user) => ({ ...user, created_at: now })), {
      ignoreDuplicates: true,
    });
    await queryInterface.bulkInsert('projects', seededProjects.map((project) => ({ ...project, created_at: now })), {
      ignoreDuplicates: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('projects', { id: seededProjects.map(({ id }) => id) });
    await queryInterface.bulkDelete('users', { id: seededUsers.map(({ id }) => id) });
  },
};
