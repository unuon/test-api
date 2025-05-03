<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function index()
    {
        return view('dashboard');
    }
    
    public function viewBudget($id)
    {
        return view('budgets.show', compact('id'));
    }
    
    public function transactions()
    {
        return view('transactions.index');
    }
}