const yahooFinance = require("yahoo-finance2").default;

async function run() {
    try {
        const quoteSummary = await yahooFinance.quoteSummary("UBER", {
            modules: [
                "defaultKeyStatistics",
                "financialData",
                "price",
                "balanceSheetHistory",
                "incomeStatementHistory",
            ],
        });

        console.log("Income History Length:", quoteSummary.incomeStatementHistory?.incomeStatementHistory?.length);
        console.log("Income History [0]:", JSON.stringify(quoteSummary.incomeStatementHistory?.incomeStatementHistory?.[0], null, 2));
        console.log("Income History [1]:", JSON.stringify(quoteSummary.incomeStatementHistory?.incomeStatementHistory?.[1], null, 2));
        console.log("Balance History Length:", quoteSummary.balanceSheetHistory?.balanceSheetStatements?.length);
    } catch (e) {
        console.error(e);
    }
}

run();
