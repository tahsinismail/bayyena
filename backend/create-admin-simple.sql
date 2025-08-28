-- Create admin user (simplified version)
-- Check if admin user exists and create if not
DO $$
DECLARE
    admin_count INTEGER;
BEGIN
    -- Check if admin user exists
    SELECT COUNT(*) INTO admin_count FROM users WHERE email = 'admin@bayyena.com';

    IF admin_count = 0 THEN
        -- Insert new admin user
        INSERT INTO users (full_name, email, hashed_password, created_at)
        VALUES ('Admin User', 'admin@bayyena.com', '$2b$10$VjOwokCFbZot2aSdg8/0U.SZoSBDUeS9jVKju7C2wWqqYjRWV1luu', NOW());

        RAISE NOTICE 'Admin user created successfully!';
    ELSE
        -- Update existing admin user's password
        UPDATE users
        SET hashed_password = '$2b$10$VjOwokCFbZot2aSdg8/0U.SZoSBDUeS9jVKju7C2wWqqYjRWV1luu'
        WHERE email = 'admin@bayyena.com';

        RAISE NOTICE 'Admin user password updated successfully!';
    END IF;
END $$;
