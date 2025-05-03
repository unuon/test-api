# Budget Management System

A comprehensive Laravel-based system for managing credit budgets, tracking expenses and optimizing financial planning. This application helps users manage shared credit limits among team members with detailed tracking, reporting, and notification features.

## Features

### Budget Management
- Create and manage budgets with detailed information
- Set credit limits and payment due dates
- Track current balances and available credit
- Monitor payment status (paid, unpaid, partially paid)

### Sub-Users Management
- Add multiple sub-users to each budget
- Assign individual credit limits to sub-users
- Track expenses and payments by each sub-user
- Monitor sub-user payment status

### Transaction Management
- Record various transaction types (expenses, income, payments)
- Detailed transaction history with filtering options
- Validation to prevent exceeding credit limits
- Update and delete transaction capabilities

### Reporting & Analytics
- Visual data representation with interactive charts
- Monthly expense and income trends
- Expense breakdowns by category and sub-user
- Export reports to Excel format

### User Experience
- Responsive design with dark/light theme support
- Real-time notifications for important actions
- Optimized API performance with batched requests
- Loading indicators for asynchronous operations

## Technical Details

### Architecture
- RESTful API backend using Laravel 12.x
- Frontend using vanilla JavaScript with modern patterns
- Chart.js integration for data visualization
- JWT authentication for secure API access

### Models
- **Budget**: Manages credit limits, payment statuses, and billing cycles
- **SubUser**: Handles authorized users with individual credit limits
- **Transaction**: Records all financial activities with detailed metadata
- **User**: Manages authentication and user profiles

### API Documentation
- SwaggerUI integration for API documentation
- Comprehensive endpoint documentation with request/response examples

## Installation

1. Clone the repository
```bash
git clone https://github.com/yourusername/budget-management.git
cd budget-management
```

2. Install PHP dependencies
```bash
composer install
```

3. Configure environment variables
```bash
cp .env.example .env
php artisan key:generate
```

4. Set up the database
```bash
php artisan migrate
php artisan db:seed
```

5. Generate JWT secret
```bash
php artisan jwt:secret
```

6. Generate API documentation
```bash
php artisan l5-swagger:generate
```

7. Serve the application
```bash
php artisan serve
```

## API Routes

The application provides the following API endpoints:

- **Authentication**: Register, login, logout, password reset
- **Budgets**: CRUD operations, transactions management
- **Sub-Users**: Management, credit status, batch operations
- **Transactions**: CRUD operations, filtering
- **Reports**: Summary data, transaction reports, visualizations

## Frontend Components

- **Dashboard**: Overview of all budgets and recent activity
- **Budget Details**: Detailed view of budget information, sub-users, and transactions
- **Transactions**: List and management of all transactions
- **Reports**: Data visualization and export capabilities

## Optimizations

- Batch API requests for sub-user data
- Optimized credit limit validation
- Cached data with configurable lifetime
- Unified notification system
- Consistent dark/light theme implementation

## Credits

Developed by Mark Rances

## License

This project is licensed under the MIT License - see the LICENSE file for details.