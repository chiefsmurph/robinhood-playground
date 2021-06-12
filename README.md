# robinhood-playground

a Node.js script that makes stock recommendations


average of 
  the absolute value of SPY trend (open to close) of previous day 
  and
  SPY distance (low to high) of previous day

times the absolute value of the overnight trend (orevious close to the current day's open)

* 4.5

= number of picks in a day


for example....

1.92 * abs value of trend overnight * 4.5 = picks
= ~ 15



`npm install`

create a config.js file that exports an object
```
export default {
    credentials: {
      username: 'robinhoodusername',
      password: 'robinhoodpassword'
    }
};
```

`npm start`

## tell me about the folders

actions are divided up into "app-actions" and "rh-actions" (robinhood actions)

modules are generally "strategies", but can be anything that runs at app init and using utils/reg-cron-after-630 something that gets run at various times of the day

## json gets saved to /json

daily-transactions - the actual transactions that the program went ahead and bought or sold for each day

picks-data - each day a folder is created that saves the "picks" for each of the strategies / modules whenever they are run

pm-perfs - how did each of the prediction-models trend at the following morning?

prediction-model - collections of strategies that are generated every time.  some are dynamically created based on past performance while others have been hand-selected in `pms/manual.js`

stock-data - contains all the output of getTrendAndSave

strat-perf-multiples - are the latest greatest method of getting the performance of all the strategies.  any time `analysis/strategy-perf-multiple.js` gets run with a daysBack > 50 (currently 1x / day) the output gets saved here

strat-perfs - how well have each of the strategies trended at various points? (next-day-9 all the way to fourth-day-330 are saved)



## tell me more how does it work?

strategies are mostly "trendFilter"s.  which just take in a Robinhood instance and the output of getTrendAndSave which contains every tickers' quote_data and a few other things.  say a strategy is configured to run `[3, 10, 15, 90]`...that means that 15 minutes after opening bell (6:30am pacific), that strategy is not going to be run just once, but it will actually be run once for 0-$5, once for $5 - $10 and a third time for $10 - $15 - each time the trendFilter only containing the tickers whose last_trade_price are within that "price segment".

when the strategy is run it returns a list of tickers (ie `[AAPL, GOOG, JAGX]`).  These "picks" are saved along with their current trading price in picks-data/[date]/[strategy-name]-[price-perm] as an object with their keys being the minute after opening bell of that particularly run.

the program will actively purchase the forPurchase strategies in settings.js which gets saved to the days' "prediction model"

## configuring

all strategies (modules/*) are enabled to run at various times per day.  they run for every increment of $1-5, $5-10, $10-15, and recently added $15-20!

settings.js determines which strategies are "enabled for purchase" as well as sent via email

also determines the purchase amount when I strategy is set to forPurchase

## what more is there to know?

it sends emails to the runner of the program for any strategies run within the forPurchase prediction model or if added to `settings.js`'s email with the key being an email address and the value being an array of strategies that you want to send to that email.  there is a list of users `cheapest-picks-email-list` which sends the `cheapest-picks-chp50--4` strategy to each of those emails.

it posts to twitter

## strategy analytics

`node run analysis/strategy-perf-multiple 52` - generates report on how well all strategies have performed over the last 52.  called "multiple" because instead of "strategy-perf-overall" that takes into consideration not just a single hardcoded "breakdown" such as next-day-9, this method takes into consideration all strat-perf data points that were recorded for that strategy.  

you can run it like this too:

`node run analysis/strategy-perf-multiple 25 next-day-330` means lookup past 25 days but only consider breakdowns up to next-day-330 (up at end the following day).   

`node run analysis/strategy-perf-multiple 25 low-float-high-volume-floatTimesfloatToVolume-trenddown7to10-shouldWatchout-fifteenTo20-95 based-on-jump-gtEightOvernight-gt500kvolume-first1-5` only considers the strategies passed in and returns additional detailed output on these strategies.  

this can be combined with the `next-day-330` option shown here along with the ability to filter out all found strategies by a collection of query phrases: `node run analysis/strategy-perf-multiple 25 next-day-330 sudden-drops filter30` but is not detailed and is broken down into filtered collections.

## prediction-model analytics

`node run analysis/pm-perf-50-14-7 sepPerfectos sepAdds` - weight recent performance of the strategies more than old trends

`node run analysis/pm-perf-day-coverage 52 sepPerfectos sepAdds` - what stocks bought and how did they trend each of the past 52 days?

`node run analysis/pm-perf-using-custom-breakdown 52 sepPerfectos sepAdds` - determine which strategies in the pm are going to be highCount'ers or lowCount'ers (does it find a pick everyday?)

`node run analysis/pm-per 52 sepPerfectos sepAdds` - straight up how did each of the strategies in these pm's perform in the given daysBack?

## somewhat deprecated analytics

`node run analysis/day-report` - reports on how the purchases the app has made today have trended since they were purchased

`node run analysis/strategy-perf-overall` - how have each of the strategies trended over the last 7 days?  by avgTrend and percUp

`node run analysis/strategy-perf-today` - of the strategies that have recorded picks today, how have they trended?

--

`node analysis/run past-on-today` - look at strategy-perf-overall... if you were to have enabled the top 10 avgPerc and top 10 percUp strategies, how well would they have done today?

## "are you ever going to clean up this mess and finally write some tests?"

maybe

## todo

* much
* truth: database needed
* look at most recent strat-perf-multiple (52 day).  of the strats enabled determine likelyhood it will hit a match today and calculate the best $ buy amount

* front-end should be used more as a way to view the incoming strategy picks highlighting the one's that may be of interest ... not just as a way to view all the trends of the given subset of strategies (pm filter)

* integrate this electron front-end https://github.com/chiefsmurph/johns-electron-playground
* better manage dependency on pattern-predict
* fix filenames saved with `<` character (see https://github.com/chiefsmurph/robinhood-playground/issues/4)
* make it profitable

* ups then downs variation: prevClose vs shiftedHist - is prevClose working troubleshoot?
* cheapest 5 stocks, cheapest 10 stocks, cheapest 15 stocks - done
* consistent-risers - constant rising since opening bell
* sell 100% of stocks if have increased in price after 24 hours
* before-close-up - return an object / make variations
* getprices should be batched for variations of strategies
* constant-risers below x trendsinceopen
