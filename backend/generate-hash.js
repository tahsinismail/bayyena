const bcrypt = require('bcrypt');

const generateHash = async () => {
  const password = 'admin@Bayyena';
  const saltRounds = 10;
  const hashedPassword = await bcrypt.hash(password, saltRounds);
  console.log('Password:', password);
  console.log('Hash:', hashedPassword);
};

generateHash();
