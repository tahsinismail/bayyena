# Use a Node.js 20 image as the base for building the frontend
FROM node:20-alpine as build

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the frontend code
COPY . .

# Build the frontend application
RUN npm run build

# Expose the port the backend runs on
EXPOSE 5173

# Command to run the application
CMD ["npm", "run", "start:frontend"]