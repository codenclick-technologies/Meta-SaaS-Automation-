const { seedAdminLogic } = require('./seedAdmin');

// Mock Mongoose models
const mockUserSave = jest.fn();
const mockOrgSave = jest.fn();
const mockOrgUsersPush = jest.fn();

const MockUser = function(data) {
    return {
        ...data,
        save: mockUserSave,
    };
};
MockUser.findOne = jest.fn();

const MockOrganization = function(data) {
    return {
        ...data,
        _id: 'mockOrgId',
        users: {
            push: mockOrgUsersPush,
            includes: jest.fn().mockReturnValue(false),
        },
        save: mockOrgSave,
    };
};
MockOrganization.findOne = jest.fn();


describe('seedAdminLogic', () => {
    // Reset mocks before each test
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('should create a new organization and a new admin user', async () => {
        // Arrange: No organization and no user exists
        MockOrganization.findOne.mockResolvedValue(null);
        MockUser.findOne.mockResolvedValue(null);

        // Act
        const { user, org } = await seedAdminLogic(MockUser, MockOrganization);

        // Assert
        // Check if Organization.findOne was called to find an org
        expect(MockOrganization.findOne).toHaveBeenCalledWith({ name: 'Default Organization' });
        // Check if a new organization was saved
        expect(mockOrgSave).toHaveBeenCalledTimes(2); // Once for creation, once for adding user
        // Check if User.findOne was called to find a user
        expect(MockUser.findOne).toHaveBeenCalledWith({ email: 'admin@example.com' });
        // Check if a new user was saved
        expect(mockUserSave).toHaveBeenCalledTimes(1);
        // Check if user was added to organization
        expect(mockOrgUsersPush).toHaveBeenCalled();
    });

    test('should use an existing organization and create a new admin user', async () => {
        // Arrange: An organization exists, but the user does not
        const existingOrg = {
            _id: 'existingOrgId',
            name: 'Default Organization',
            users: {
                push: mockOrgUsersPush,
                includes: jest.fn().mockReturnValue(false),
            },
            save: mockOrgSave,
        };
        MockOrganization.findOne.mockResolvedValue(existingOrg);
        MockUser.findOne.mockResolvedValue(null);

        // Act
        await seedAdminLogic(MockUser, MockOrganization);

        // Assert
        expect(MockOrganization.findOne).toHaveBeenCalledWith({ name: 'Default Organization' });
        // Org save should only be called once to add the user
        expect(mockOrgSave).toHaveBeenCalledTimes(1);
        expect(MockUser.findOne).toHaveBeenCalledWith({ email: 'admin@example.com' });
        expect(mockUserSave).toHaveBeenCalledTimes(1);
        expect(mockOrgUsersPush).toHaveBeenCalled();
    });

    test('should update an existing user to be an admin', async () => {
        // Arrange: Both organization and user exist
        const existingOrg = {
            _id: 'existingOrgId',
            name: 'Default Organization',
            users: {
                push: mockOrgUsersPush,
                includes: jest.fn().mockReturnValue(true), // User is already in the org list
            },
            save: mockOrgSave,
        };
        const existingUser = {
            name: 'Existing User',
            email: 'admin@example.com',
            role: 'user', // Starts as a normal user
            organizationId: 'someOtherOrg',
            save: mockUserSave,
        };
        MockOrganization.findOne.mockResolvedValue(existingOrg);
        MockUser.findOne.mockResolvedValue(existingUser);

        // Act
        await seedAdminLogic(MockUser, MockOrganization);

        // Assert
        expect(MockUser.findOne).toHaveBeenCalledWith({ email: 'admin@example.com' });
        // Check that the user's role and organization are updated
        expect(existingUser.role).toBe('admin');
        expect(existingUser.organizationId).toBe(existingOrg._id);
        expect(mockUserSave).toHaveBeenCalledTimes(1);
        // Org save and push should not be called if user is already linked
        expect(mockOrgSave).not.toHaveBeenCalled();
        expect(mockOrgUsersPush).not.toHaveBeenCalled();
    });

    test('should link user to organization if not already linked', async () => {
        // Arrange: Org and user exist, but are not linked
        const existingOrg = {
            _id: 'existingOrgId',
            name: 'Default Organization',
            users: {
                push: mockOrgUsersPush,
                includes: jest.fn().mockReturnValue(false), // User is NOT in the org list
            },
            save: mockOrgSave,
        };
        const existingUser = {
            _id: 'existingUserId',
            name: 'Existing User',
            email: 'admin@example.com',
            role: 'user',
            save: mockUserSave,
        };
        MockOrganization.findOne.mockResolvedValue(existingOrg);
        MockUser.findOne.mockResolvedValue(existingUser);

        // Act
        await seedAdminLogic(MockUser, MockOrganization);

        // Assert
        expect(mockOrgUsersPush).toHaveBeenCalledWith('existingUserId');
        expect(mockOrgSave).toHaveBeenCalledTimes(1);
    });
});
