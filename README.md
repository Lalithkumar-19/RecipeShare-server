# Recipe Sharing Server

This is the backend server for the Recipe Sharing application. It provides authentication, recipe management, user profile updates, and other essential functionalities.

## Tech Stack
- **Backend:** Node.js, Express.js
- **Database:** SQLite3
- **Authentication:** Email & Password, Google OAuth
- **Storage:** Cloudinary (for image uploads)
- **Hosting:** Deployed on Render

## Features
- User authentication with email & password
- Google OAuth login
- Recipe CRUD operations
- Save recipes as favorites
- Delete saved recipes
- Generate AI-based recipes
- User profile updates (profile picture & username)
- Comment system on recipes

## Installation & Setup

### Prerequisites
Ensure you have the following installed:
- Node.js (v16 or later)
- npm or yarn

### Clone the Repository
```sh
git clone https://github.com/your-repo/recipe-sharing-server.git
cd recipe-sharing-server
```

### Install Dependencies
```sh
npm install
```

### Set Up Environment Variables
Create a `.env` file in the root directory and add the following:
```env
PORT=5000
DATABASE_URL=sqlite3
JWT_SECRET=your_secret_key
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

### Run the Server
```sh
npm start
```
Server will run on `http://localhost:5000`.

## API Routes

### Authentication Routes
| Method | Endpoint | Description |
|--------|---------|-------------|
| POST | `/login` | Login with email & password |
| POST | `/signup` | Register a new user |
| POST | `/google-login` | Login using Google OAuth |
| POST | `/forgot-password` | Send password reset link |
| POST | `/reset-password` | Reset user password |

### Recipe Routes
| Method | Endpoint | Description |
|--------|---------|-------------|
| GET | `/recipes` | Get all recipes |
| GET | `/getFiltered` | Get filtered recipes based on criteria |
| GET | `/recipes/:id` | Get a single recipe by ID |
| POST | `/recipes` | Upload a new recipe (Auth required) |
| GET | `/getFavRecipes` | Get user's saved recipes |
| POST | `/saveRecipe` | Save a recipe to favorites |
| PUT | `/removeFromSaved` | Remove a recipe from saved list |
| DELETE | `/deleteRecipe` | Delete a recipe (Auth required) |
| GET | `/getFavRecipeslist` | Get list of favorite recipes |
| GET | `/getpostedRecipes` | Get list of user's posted recipes |
| GET | `/generateRecipe` | Generate a recipe using AI |

### User Routes
| Method | Endpoint | Description |
|--------|---------|-------------|
| POST | `/updateUserdp` | Update user profile picture (Auth required) |
| POST | `/updateUserName` | Update user name (Auth required) |
| POST | `/comments` | Post a comment on a recipe (Auth required) |
| GET | `/comments` | Get comments for a recipe |
| DELETE | `/comments/:id` | Delete a comment (Auth required) |

## Contributors
This project was built by a team of 3 contributors to gain experience in team collaboration and backend development.
This project was collaboratively built by:

# Jhansi meri -jhansi543 
# Ganesh Bv -ganesh-basavoju
# Abhi Chimmili -abhichimmili

## License
This project is licensed under the MIT License.
