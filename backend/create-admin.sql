-- Create admin user
-- First, let's check if the admin user exists
DO $$
DECLARE
    admin_count INTEGER;
    hashed_password TEXT;
BEGIN
    -- Hash the password using bcrypt (we'll use a simple hash for now)
    hashed_password := '$2b$10$VjOwokCFbZot2aSdg8/0U.SZoSBDUeS9jVKju7C2wWqqYjRWV1luu'; -- This is 'admin@Bayyena' hashed

    -- Check if admin user exists
    SELECT COUNT(*) INTO admin_count FROM users WHERE email = 'admin@bayyena.com';

    IF admin_count = 0 THEN
        -- Insert new admin user
        INSERT INTO users (full_name, email, hashed_password, role, is_active, created_at)
        VALUES ('Admin User', 'admin@bayyena.com', hashed_password, 'admin', 1, NOW());

        RAISE NOTICE 'Admin user created successfully!';
    ELSE
        -- Update existing admin user
        UPDATE users
        SET hashed_password = hashed_password,
            role = 'admin',
            is_active = 1
        WHERE email = 'admin@bayyena.com';

        RAISE NOTICE 'Admin user updated successfully!';
    END IF;
END $$;
