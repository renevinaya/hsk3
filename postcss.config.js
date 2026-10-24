import prunevariables from 'postcss-prune-var'
import purgeCSSPlugin from '@fullhuman/postcss-purgecss'

export default {
  plugins: [
    prunevariables(),
    purgeCSSPlugin({
      content: ['./**/*.vue', './index.html']
    })
  ]
}