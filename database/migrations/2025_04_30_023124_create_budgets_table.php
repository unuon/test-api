<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('budgets', function (Blueprint $table) {
            $table->id('budget_id');
            $table->string('budget_name');
            $table->enum('payment_status', ['paid', 'unpaid', 'partially_paid'])->default('unpaid');
            $table->date('payment_due_date')->nullable();
            $table->date('billing_cycle_start')->nullable();
            $table->date('billing_cycle_end')->nullable();
            $table->decimal('total_limit', 10, 2)->default(0);
            $table->decimal('current_balance', 10, 2)->default(0);
            $table->foreignId('user_id');
            $table->foreign('user_id')->references('user_id')->on('user');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('budgets');
    }
};