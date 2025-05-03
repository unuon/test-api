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
        Schema::create('sub_users', function (Blueprint $table) {
            $table->id('sub_user_id');
            $table->string('sub_user_name');
            $table->enum('sub_payment_status', ['paid', 'unpaid', 'partially_paid'])->default('unpaid');
            $table->decimal('credit_limit', 10, 2)->nullable();
            $table->date('start_date');
            $table->date('end_date')->nullable();
            $table->foreignId('budget_id')->constrained('budgets', 'budget_id')->onDelete('cascade');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('sub_users');
    }
};